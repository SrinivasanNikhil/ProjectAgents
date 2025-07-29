import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Milestone, IMilestone } from './Milestone';
import { Project } from './Project';
import { User } from './User';
import { Persona } from './Persona';
import { Artifact } from './Artifact';

describe('Milestone Model', () => {
  let mongoServer: MongoMemoryServer;
  let testProject: any;
  let testPersona: any;
  let testUser: any;
  let testArtifact: any;

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
    await Milestone.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});
    await Persona.deleteMany({});
    await Artifact.deleteMany({});

    // Create test dependencies
    testUser = await User.create({
      email: 'instructor@example.com',
      firstName: 'Test',
      lastName: 'Instructor',
      role: 'instructor',
      password: 'TestPassword123!',
      department: 'Computer Science',
      instructorId: 'INST001',
    });

    const testStudent = await User.create({
      email: 'student@example.com',
      firstName: 'Test',
      lastName: 'Student',
      role: 'student',
      password: 'TestPassword123!',
      department: 'Computer Science',
      studentId: 'STU001',
    });

    testProject = await Project.create({
      name: 'Test Project',
      description: 'A test project',
      projectType: 'web-application',
      industry: 'technology',
      scope: 'small',
      timeline: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      instructor: testUser._id,
      students: [testStudent._id],
      status: 'active',
    });

    testPersona = await Persona.create({
      name: 'Test Persona',
      role: 'Product Manager',
      project: testProject._id,
      background: 'This is a comprehensive background for a Product Manager persona with extensive experience in product development, stakeholder management, and strategic planning. This character brings years of expertise to the project.',
      personality: {
        traits: ['analytical', 'detail-oriented', 'collaborative'],
        communicationStyle: 'formal',
        decisionMakingStyle: 'analytical',
        priorities: ['deliver quality products', 'meet project timelines'],
        goals: ['deliver on time and within budget'],
      },
      aiConfiguration: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: 'You are a professional Product Manager with extensive experience in product development, stakeholder management, and strategic planning. You communicate formally and make analytical decisions.',
        contextWindow: 10,
      },
    });

    testArtifact = await Artifact.create({
      filename: 'test-document.pdf',
      originalName: 'test-document.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      path: '/uploads/test-document.pdf',
      uploadedBy: testUser._id,
      project: testProject._id,
      type: 'document',
    });
  });

  describe('Schema Validation', () => {
    it('should create a milestone with valid data', async () => {
      const milestoneData = {
        project: testProject._id,
        name: 'First Milestone',
        description: 'This is the first milestone',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        type: 'deliverable',
        requirements: [
          {
            title: 'Project Proposal',
            description: 'Submit a detailed project proposal',
            isRequired: true,
            type: 'file',
          },
        ],
      };

      const milestone = await Milestone.create(milestoneData);
      expect(milestone).toBeDefined();
      expect(milestone.name).toBe('First Milestone');
      expect(milestone.status).toBe('pending'); // default value
      expect(milestone.requirements).toHaveLength(1);
      expect(milestone.personaSignOffs).toHaveLength(0);
      expect(milestone.submissions).toHaveLength(0);
    });

    it('should require all mandatory fields', async () => {
      const incompleteData = {
        name: 'Incomplete Milestone',
      };

      await expect(Milestone.create(incompleteData)).rejects.toThrow();
    });

    it('should validate milestone name length', async () => {
      const longName = 'a'.repeat(101); // exceeds 100 character limit
      const milestoneData = {
        project: testProject._id,
        name: longName,
        description: 'Valid description',
        dueDate: new Date(),
        type: 'deliverable',
      };

      await expect(Milestone.create(milestoneData)).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const milestoneData = {
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Valid description',
        dueDate: new Date(),
        type: 'deliverable',
        status: 'invalid-status',
      };

      await expect(Milestone.create(milestoneData)).rejects.toThrow();
    });

    it('should validate type enum values', async () => {
      const milestoneData = {
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Valid description',
        dueDate: new Date(),
        type: 'invalid-type',
      };

      await expect(Milestone.create(milestoneData)).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let milestone: IMilestone;

    beforeEach(async () => {
      milestone = await Milestone.create({
        project: testProject._id,
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

      it('should return true for past due date with pending status', async () => {
        milestone.dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
        expect(milestone.isOverdue()).toBe(true);
      });

      it('should return false for past due date with completed status', async () => {
        milestone.dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
        milestone.status = 'completed';
        expect(milestone.isOverdue()).toBe(false);
      });
    });

    describe('getCompletionPercentage()', () => {
      it('should return 0 when no persona sign-offs exist', () => {
        expect(milestone.getCompletionPercentage()).toBe(0);
      });

      it('should calculate percentage correctly with mixed sign-off statuses', async () => {
        milestone.personaSignOffs = [
          { persona: testPersona._id, status: 'approved' },
          { persona: testPersona._id, status: 'pending' },
          { persona: testPersona._id, status: 'approved' },
          { persona: testPersona._id, status: 'rejected' },
        ];

        expect(milestone.getCompletionPercentage()).toBe(50); // 2 out of 4 approved
      });

      it('should return 100 when all sign-offs are approved', async () => {
        milestone.personaSignOffs = [
          { persona: testPersona._id, status: 'approved' },
          { persona: testPersona._id, status: 'approved' },
        ];

        expect(milestone.getCompletionPercentage()).toBe(100);
      });
    });

    describe('addPersonaSignOff()', () => {
      it('should add new persona sign-off', async () => {
        await milestone.addPersonaSignOff(testPersona._id);
        
        expect(milestone.personaSignOffs).toHaveLength(1);
        expect(milestone.personaSignOffs[0].persona.toString()).toBe(testPersona._id.toString());
        expect(milestone.personaSignOffs[0].status).toBe('pending');
      });

      it('should not add duplicate persona sign-off', async () => {
        await milestone.addPersonaSignOff(testPersona._id);
        await milestone.addPersonaSignOff(testPersona._id);
        
        expect(milestone.personaSignOffs).toHaveLength(1);
      });
    });

    describe('updatePersonaSignOff()', () => {
      beforeEach(async () => {
        await milestone.addPersonaSignOff(testPersona._id);
      });

      it('should update sign-off status and feedback', async () => {
        await milestone.updatePersonaSignOff(
          testPersona._id,
          'approved',
          'Looks great!',
          8
        );

        const signOff = milestone.personaSignOffs[0];
        expect(signOff.status).toBe('approved');
        expect(signOff.feedback).toBe('Looks great!');
        expect(signOff.satisfactionScore).toBe(8);
        expect(signOff.signedOffAt).toBeDefined();
      });

      it('should set signedOffAt date for approved status', async () => {
        await milestone.updatePersonaSignOff(testPersona._id, 'approved');
        
        const signOff = milestone.personaSignOffs[0];
        expect(signOff.signedOffAt).toBeDefined();
      });

      it('should set signedOffAt date for rejected status', async () => {
        await milestone.updatePersonaSignOff(testPersona._id, 'rejected');
        
        const signOff = milestone.personaSignOffs[0];
        expect(signOff.signedOffAt).toBeDefined();
      });

      it('should not set signedOffAt for pending status', async () => {
        await milestone.updatePersonaSignOff(testPersona._id, 'pending');
        
        const signOff = milestone.personaSignOffs[0];
        expect(signOff.signedOffAt).toBeUndefined();
      });
    });

    describe('addSubmission()', () => {
      it('should add student submission with artifacts', async () => {
        const testStudent = await User.findOne({ role: 'student' });
        await milestone.addSubmission(
          testStudent!._id,
          [testArtifact._id],
          'Here is my submission for the first milestone'
        );

        expect(milestone.submissions).toHaveLength(1);
        const submission = milestone.submissions[0];
        expect(submission.student.toString()).toBe(testStudent!._id.toString());
        expect(submission.artifacts).toHaveLength(1);
        expect(submission.artifacts[0].toString()).toBe(testArtifact._id.toString());
        expect(submission.description).toBe('Here is my submission for the first milestone');
        expect(submission.status).toBe('submitted');
        expect(submission.submittedAt).toBeDefined();
      });

      it('should add submission without artifacts', async () => {
        const testStudent = await User.findOne({ role: 'student' });
        await milestone.addSubmission(
          testStudent!._id,
          [],
          'Text-only submission'
        );

        expect(milestone.submissions).toHaveLength(1);
        const submission = milestone.submissions[0];
        expect(submission.artifacts).toHaveLength(0);
        expect(submission.description).toBe('Text-only submission');
      });
    });
  });

  describe('Virtual Properties', () => {
    let milestone: IMilestone;

    beforeEach(async () => {
      milestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        type: 'deliverable',
      });
    });

    describe('daysUntilDue', () => {
      it('should calculate positive days for future due date', () => {
        expect(milestone.daysUntilDue).toBeGreaterThan(0);
        expect(milestone.daysUntilDue).toBeLessThanOrEqual(5);
      });

      it('should calculate negative days for past due date', async () => {
        milestone.dueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
        expect(milestone.daysUntilDue).toBeLessThan(0);
      });
    });

    describe('averageSatisfactionScore', () => {
      it('should return null when no satisfaction scores exist', () => {
        expect(milestone.averageSatisfactionScore).toBeNull();
      });

      it('should calculate average satisfaction score correctly', async () => {
        milestone.personaSignOffs = [
          { persona: testPersona._id, status: 'approved', satisfactionScore: 8 },
          { persona: testPersona._id, status: 'approved', satisfactionScore: 9 },
          { persona: testPersona._id, status: 'approved', satisfactionScore: 7 },
        ];

        expect(milestone.averageSatisfactionScore).toBe(8.0);
      });

      it('should ignore sign-offs without satisfaction scores', async () => {
        milestone.personaSignOffs = [
          { persona: testPersona._id, status: 'approved', satisfactionScore: 8 },
          { persona: testPersona._id, status: 'pending' }, // no score
          { persona: testPersona._id, status: 'approved', satisfactionScore: 10 },
        ];

        expect(milestone.averageSatisfactionScore).toBe(9.0); // (8 + 10) / 2
      });
    });
  });

  describe('Database Relationships', () => {
    it('should populate project reference', async () => {
      const milestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
      });

      const populatedMilestone = await Milestone.findById(milestone._id).populate('project');
      expect(populatedMilestone?.project).toBeDefined();
      expect((populatedMilestone?.project as any).name).toBe('Test Project');
    });

    it('should populate persona references in sign-offs', async () => {
      const milestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        personaSignOffs: [
          { persona: testPersona._id, status: 'pending' }
        ],
      });

      const populatedMilestone = await Milestone.findById(milestone._id)
        .populate('personaSignOffs.persona');
      
      expect(populatedMilestone?.personaSignOffs[0].persona).toBeDefined();
      expect((populatedMilestone?.personaSignOffs[0].persona as any).name).toBe('Test Persona');
    });

    it('should populate user references in submissions', async () => {
      const testStudent = await User.findOne({ role: 'student' });
      const milestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        submissions: [
          {
            student: testStudent!._id,
            submittedAt: new Date(),
            artifacts: [],
            description: 'Test submission',
            status: 'submitted',
          }
        ],
      });

      const populatedMilestone = await Milestone.findById(milestone._id)
        .populate('submissions.student');
      
      expect(populatedMilestone?.submissions[0].student).toBeDefined();
      expect((populatedMilestone?.submissions[0].student as any).email).toBe('student@example.com');
    });

    it('should populate artifact references in submissions', async () => {
      const testStudent = await User.findOne({ role: 'student' });
      const milestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        submissions: [
          {
            student: testStudent!._id,
            submittedAt: new Date(),
            artifacts: [testArtifact._id],
            description: 'Test submission',
            status: 'submitted',
          }
        ],
      });

      const populatedMilestone = await Milestone.findById(milestone._id)
        .populate('submissions.artifacts');
      
      expect(populatedMilestone?.submissions[0].artifacts[0]).toBeDefined();
      expect((populatedMilestone?.submissions[0].artifacts[0] as any).filename).toBe('test-document.pdf');
    });
  });

  describe('Evaluation System', () => {
    let milestone: IMilestone;

    beforeEach(async () => {
      milestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        evaluation: {
          rubric: [
            {
              criterion: 'Quality',
              weight: 50,
              maxScore: 10,
              description: 'Overall quality of the work',
            },
            {
              criterion: 'Completeness',
              weight: 30,
              maxScore: 10,
              description: 'How complete the submission is',
            },
            {
              criterion: 'Creativity',
              weight: 20,
              maxScore: 10,
              description: 'Creative aspects of the solution',
            },
          ],
          scores: new Map(),
          feedback: new Map(),
        },
      });
    });

    it('should create milestone with evaluation rubric', () => {
      expect(milestone.evaluation.rubric).toHaveLength(3);
      expect(milestone.evaluation.rubric[0].criterion).toBe('Quality');
      expect(milestone.evaluation.rubric[0].weight).toBe(50);
      expect(milestone.evaluation.rubric[0].maxScore).toBe(10);
    });

    it('should validate rubric weight constraints', async () => {
      const invalidRubric = {
        project: testProject._id,
        name: 'Invalid Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        evaluation: {
          rubric: [
            {
              criterion: 'Quality',
              weight: 150, // exceeds maximum of 100
              maxScore: 10,
              description: 'Invalid weight',
            },
          ],
          scores: new Map(),
          feedback: new Map(),
        },
      };

      await expect(Milestone.create(invalidRubric)).rejects.toThrow();
    });

    it('should validate rubric max score constraints', async () => {
      const invalidRubric = {
        project: testProject._id,
        name: 'Invalid Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        evaluation: {
          rubric: [
            {
              criterion: 'Quality',
              weight: 50,
              maxScore: 0, // below minimum of 1
              description: 'Invalid max score',
            },
          ],
          scores: new Map(),
          feedback: new Map(),
        },
      };

      await expect(Milestone.create(invalidRubric)).rejects.toThrow();
    });
  });

  describe('Settings Validation', () => {
    it('should use default settings when not provided', async () => {
      const milestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
      });

      expect(milestone.settings.requireAllPersonaApprovals).toBe(true);
      expect(milestone.settings.allowResubmission).toBe(true);
      expect(milestone.settings.maxResubmissions).toBe(3);
      expect(milestone.settings.autoCloseAfterDays).toBe(7);
    });

    it('should validate maxResubmissions constraints', async () => {
      const invalidSettings = {
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        settings: {
          maxResubmissions: 15, // exceeds maximum of 10
        },
      };

      await expect(Milestone.create(invalidSettings)).rejects.toThrow();
    });

    it('should validate autoCloseAfterDays constraints', async () => {
      const invalidSettings = {
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        settings: {
          autoCloseAfterDays: 0, // below minimum of 1
        },
      };

      await expect(Milestone.create(invalidSettings)).rejects.toThrow();
    });
  });

  describe('Index Performance', () => {
    it('should have proper indexes for query performance', async () => {
      const indexes = await Milestone.collection.getIndexes();
      
      // Check that key indexes exist
      const indexFields = Object.keys(indexes).join(',');
      expect(indexFields).toContain('project_1');
      expect(indexFields).toContain('dueDate_1');
      expect(indexFields).toContain('status_1');
      expect(indexFields).toContain('type_1');
    });
  });
});