import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Milestone, IMilestone } from './Milestone';

describe('Milestone Model', () => {
  let mongoServer: MongoMemoryServer;
  let testProjectId: mongoose.Types.ObjectId;
  let testUserId: mongoose.Types.ObjectId;
  let testPersonaId: mongoose.Types.ObjectId;
  let testArtifactId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await mongoose.connection.db.dropDatabase();

    // Create test ObjectIds for relationships
    testProjectId = new mongoose.Types.ObjectId();
    testUserId = new mongoose.Types.ObjectId();
    testPersonaId = new mongoose.Types.ObjectId();
    testArtifactId = new mongoose.Types.ObjectId();
  });

  describe('Schema Validation', () => {
    it('should create a milestone with valid data', async () => {
      const milestoneData = {
        project: testProjectId,
        name: 'Project Kickoff',
        description: 'Initial project milestone',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        type: 'deliverable' as const,
        requirements: [
          {
            title: 'Project Plan',
            description: 'Complete project planning document',
            isRequired: true,
            type: 'file' as const,
          },
        ],
      };

      const milestone = new Milestone(milestoneData);
      await milestone.save();

      expect(milestone.name).toBe('Project Kickoff');
      expect(milestone.status).toBe('pending'); // default value
      expect(milestone.settings.requireAllPersonaApprovals).toBe(true); // default value
      expect(milestone.requirements).toHaveLength(1);
    });

    it('should require required fields', async () => {
      const milestone = new Milestone({});

      await expect(milestone.save()).rejects.toThrow();
    });

    it('should validate enum values', async () => {
      const milestoneData = {
        project: testProjectId,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'invalid-type', // Invalid enum value
      };

      const milestone = new Milestone(milestoneData);
      await expect(milestone.save()).rejects.toThrow();
    });

    it('should validate string length limits', async () => {
      const milestoneData = {
        project: testProjectId,
        name: 'x'.repeat(101), // Exceeds 100 character limit
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable' as const,
      };

      const milestone = new Milestone(milestoneData);
      await expect(milestone.save()).rejects.toThrow();
    });

    it('should validate satisfaction score range', async () => {
      const milestoneData = {
        project: testProjectId,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable' as const,
        personaSignOffs: [
          {
            persona: testPersonaId,
            status: 'approved' as const,
            satisfactionScore: 11, // Exceeds max of 10
          },
        ],
      };

      const milestone = new Milestone(milestoneData);
      await expect(milestone.save()).rejects.toThrow();
    });
  });

  describe('Model Relationships', () => {
    it('should store project reference', async () => {
      const milestone = await Milestone.create({
        project: testProjectId,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
      });

      expect(milestone.project.toString()).toBe(testProjectId.toString());
    });

    it('should store persona relationships in sign-offs', async () => {
      const milestone = await Milestone.create({
        project: testProjectId,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        personaSignOffs: [
          {
            persona: testPersonaId,
            status: 'pending',
          },
        ],
      });

      expect(milestone.personaSignOffs).toHaveLength(1);
      expect(milestone.personaSignOffs[0].persona.toString()).toBe(testPersonaId.toString());
      expect(milestone.personaSignOffs[0].status).toBe('pending');
    });

    it('should store student relationships in submissions', async () => {
      const milestone = await Milestone.create({
        project: testProjectId,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        submissions: [
          {
            student: testUserId,
            artifacts: [testArtifactId],
            description: 'Test submission',
          },
        ],
      });

      expect(milestone.submissions).toHaveLength(1);
      expect(milestone.submissions[0].student.toString()).toBe(testUserId.toString());
      expect(milestone.submissions[0].artifacts[0].toString()).toBe(testArtifactId.toString());
      expect(milestone.submissions[0].description).toBe('Test submission');
    });
  });

  describe('Instance Methods', () => {
    let milestone: IMilestone;

    beforeEach(async () => {
      milestone = await Milestone.create({
        project: testProjectId,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        type: 'deliverable',
      });
    });

    describe('isOverdue()', () => {
      it('should return false for future due date', () => {
        expect(milestone.isOverdue()).toBe(false);
      });

      it('should return true for past due date', async () => {
        milestone.dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
        await milestone.save();
        expect(milestone.isOverdue()).toBe(true);
      });

      it('should return false for completed milestone even if past due', async () => {
        milestone.dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
        milestone.status = 'completed';
        await milestone.save();
        expect(milestone.isOverdue()).toBe(false);
      });
    });

    describe('getCompletionPercentage()', () => {
      it('should return 0 for milestone with no persona sign-offs', () => {
        expect(milestone.getCompletionPercentage()).toBe(0);
      });

      it('should calculate correct percentage for partial approvals', async () => {
        milestone.personaSignOffs = [
          { persona: testPersonaId, status: 'approved' },
          { persona: testPersonaId, status: 'pending' },
          { persona: testPersonaId, status: 'approved' },
        ];
        await milestone.save();

        expect(milestone.getCompletionPercentage()).toBe(67); // 2/3 = 66.67%, rounded to 67
      });

      it('should return 100 for all approved sign-offs', async () => {
        milestone.personaSignOffs = [
          { persona: testPersonaId, status: 'approved' },
          { persona: testPersonaId, status: 'approved' },
        ];
        await milestone.save();

        expect(milestone.getCompletionPercentage()).toBe(100);
      });
    });

    describe('addPersonaSignOff()', () => {
      it('should add new persona sign-off', async () => {
        await milestone.addPersonaSignOff(testPersonaId);

        expect(milestone.personaSignOffs).toHaveLength(1);
        expect(milestone.personaSignOffs[0].persona.toString()).toBe(testPersonaId.toString());
        expect(milestone.personaSignOffs[0].status).toBe('pending');
      });

      it('should not duplicate existing persona sign-off', async () => {
        await milestone.addPersonaSignOff(testPersonaId);
        await milestone.addPersonaSignOff(testPersonaId);

        expect(milestone.personaSignOffs).toHaveLength(1);
      });
    });

    describe('updatePersonaSignOff()', () => {
      beforeEach(async () => {
        await milestone.addPersonaSignOff(testPersonaId);
      });

      it('should update sign-off status and set signed off date', async () => {
        await milestone.updatePersonaSignOff(testPersonaId, 'approved', 'Looks good!', 8);

        const signOff = milestone.personaSignOffs[0];
        expect(signOff.status).toBe('approved');
        expect(signOff.feedback).toBe('Looks good!');
        expect(signOff.satisfactionScore).toBe(8);
        expect(signOff.signedOffAt).toBeDefined();
      });

      it('should not set signed off date for pending status', async () => {
        await milestone.updatePersonaSignOff(testPersonaId, 'pending');

        const signOff = milestone.personaSignOffs[0];
        expect(signOff.status).toBe('pending');
        expect(signOff.signedOffAt).toBeUndefined();
      });
    });

    describe('addSubmission()', () => {
      it('should add student submission', async () => {
        await milestone.addSubmission(testUserId, [testArtifactId], 'Test submission');

        expect(milestone.submissions).toHaveLength(1);
        expect(milestone.submissions[0].student.toString()).toBe(testUserId.toString());
        expect(milestone.submissions[0].artifacts).toHaveLength(1);
        expect(milestone.submissions[0].description).toBe('Test submission');
        expect(milestone.submissions[0].status).toBe('submitted');
        expect(milestone.submissions[0].submittedAt).toBeDefined();
      });
    });
  });

  describe('Virtual Fields', () => {
    let milestone: IMilestone;

    beforeEach(async () => {
      milestone = await Milestone.create({
        project: testProjectId,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        type: 'deliverable',
        personaSignOffs: [
          { persona: testPersonaId, status: 'approved', satisfactionScore: 8 },
          { persona: testPersonaId, status: 'approved', satisfactionScore: 9 },
          { persona: testPersonaId, status: 'pending' }, // No score
        ],
      });
    });

    describe('daysUntilDue', () => {
      it('should calculate days until due date', () => {
        const daysUntilDue = milestone.daysUntilDue;
        expect(daysUntilDue).toBe(5);
      });

      it('should return negative value for overdue milestones', async () => {
        milestone.dueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
        await milestone.save();

        const daysUntilDue = milestone.daysUntilDue;
        expect(daysUntilDue).toBe(-2);
      });
    });

    describe('averageSatisfactionScore', () => {
      it('should calculate average satisfaction score', () => {
        const avgScore = milestone.averageSatisfactionScore;
        expect(avgScore).toBe(8.5); // (8 + 9) / 2 = 8.5
      });

      it('should return null when no scores exist', async () => {
        milestone.personaSignOffs = [
          { persona: testPersonaId, status: 'pending' },
        ];
        await milestone.save();

        const avgScore = milestone.averageSatisfactionScore;
        expect(avgScore).toBeNull();
      });
    });
  });

  describe('Database Operations', () => {
    it('should work with database queries', async () => {
      // Create a milestone to test basic database operations
      const milestone = await Milestone.create({
        project: testProjectId,
        name: 'Database Test',
        description: 'Test milestone for database operations',
        dueDate: new Date(),
        type: 'deliverable',
      });

      // Test that we can find and update the milestone
      const found = await Milestone.findById(milestone._id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Database Test');
      
      // Test update
      if (found) {
        found.status = 'in-progress';
        await found.save();
        
        const updated = await Milestone.findById(milestone._id);
        expect(updated?.status).toBe('in-progress');
      }
    });

    it('should handle complex queries efficiently', async () => {
      // Create multiple milestones for testing
      await Milestone.create([
        {
          project: testProjectId,
          name: 'Milestone 1',
          description: 'First milestone',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          type: 'deliverable',
          status: 'pending',
        },
        {
          project: testProjectId,
          name: 'Milestone 2',
          description: 'Second milestone',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          type: 'review',
          status: 'in-progress',
        },
      ]);

      // Test complex query
      const milestones = await Milestone.find({
        project: testProjectId,
        status: { $in: ['pending', 'in-progress'] },
        dueDate: { $gte: new Date() },
      }).sort({ dueDate: 1 });

      expect(milestones).toHaveLength(2);
      expect(milestones[0].name).toBe('Milestone 1');
      expect(milestones[1].name).toBe('Milestone 2');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty arrays gracefully', async () => {
      const milestone = await Milestone.create({
        project: testProjectId,
        name: 'Empty Milestone',
        description: 'Milestone with empty arrays',
        dueDate: new Date(),
        type: 'deliverable',
        requirements: [],
        personaSignOffs: [],
        submissions: [],
      });

      expect(milestone.getCompletionPercentage()).toBe(0);
      expect(milestone.averageSatisfactionScore).toBeNull();
    });

    it('should handle invalid ObjectIds gracefully', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      
      const milestone = await Milestone.create({
        project: testProjectId,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
      });

      await milestone.addPersonaSignOff(invalidId);
      await milestone.updatePersonaSignOff(invalidId, 'approved');

      // Should not throw, but also should not find the sign-off
      expect(milestone.personaSignOffs).toHaveLength(1);
      expect(milestone.personaSignOffs[0].persona.toString()).toBe(invalidId.toString());
    });

    it('should preserve data integrity during sequential updates', async () => {
      const milestone = await Milestone.create({
        project: testProjectId,
        name: 'Sequential Test',
        description: 'Test sequential updates',
        dueDate: new Date(),
        type: 'deliverable',
      });

      // Simulate sequential sign-off additions (avoiding parallel save issues)
      const personaIds = Array.from({ length: 3 }, () => new mongoose.Types.ObjectId());
      
      for (const personaId of personaIds) {
        await milestone.addPersonaSignOff(personaId);
      }

      const updatedMilestone = await Milestone.findById(milestone._id);
      expect(updatedMilestone?.personaSignOffs).toHaveLength(3);
      
      // Verify all personas were added
      const storedPersonaIds = updatedMilestone?.personaSignOffs.map(s => s.persona.toString()) || [];
      personaIds.forEach(id => {
        expect(storedPersonaIds).toContain(id.toString());
      });
    });
  });

  describe('JSON Serialization', () => {
    it('should include virtual fields in JSON output', async () => {
      const milestone = await Milestone.create({
        project: testProjectId,
        name: 'JSON Test',
        description: 'Test JSON serialization',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        type: 'deliverable',
        personaSignOffs: [
          { persona: testPersonaId, status: 'approved', satisfactionScore: 7 },
        ],
      });

      const json = milestone.toJSON();
      expect(json.daysUntilDue).toBeDefined();
      expect(json.averageSatisfactionScore).toBeDefined();
      expect(json.id).toBeDefined(); // Virtual _id -> id mapping
    });
  });
});