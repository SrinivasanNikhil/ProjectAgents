import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  milestoneService,
  CreateMilestoneData,
  PersonaSignOffData,
  SubmissionData,
} from './milestoneService';
import { Milestone } from '../models/Milestone';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { Persona } from '../models/Persona';
import { Artifact } from '../models/Artifact';

describe('MilestoneService', () => {
  let mongoServer: MongoMemoryServer;
  let testProject: any;
  let testInstructor: any;
  let testStudent: any;
  let testPersona: any;
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
    await mongoose.connection.db.dropDatabase();

    // Create test instructor
    testInstructor = await User.create({
      email: 'instructor@test.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Instructor',
      role: 'instructor',
      department: 'Computer Science',
      instructorId: 'INST001',
    });

    // Create test student
    testStudent = await User.create({
      email: 'student@test.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Student',
      role: 'student',
      department: 'Computer Science',
      studentId: 'STU001',
    });

    // Create test project
    testProject = await Project.create({
      name: 'Test Project',
      description: 'A test project for milestone testing',
      projectType: 'web-application',
      industry: 'technology',
      scope: 'medium',
      timeline: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      instructor: testInstructor._id,
      students: [testStudent._id],
      metadata: {
        totalMilestones: 0,
        lastActivity: new Date(),
      },
    });

    // Create test persona
    testPersona = await Persona.create({
      name: 'Test Client',
      role: 'Product Manager',
      project: testProject._id,
      background:
        'An experienced product manager with expertise in agile development methodologies and team leadership.',
      personality: {
        traits: [
          'analytical',
          'detail-oriented',
          'collaborative',
          'organized',
          'communicative',
        ],
        communicationStyle: 'collaborative',
        decisionMakingStyle: 'consensus-driven',
        priorities: [
          'quality assurance',
          'timeline adherence',
          'team collaboration',
        ],
        goals: [
          'successful project delivery with high quality standards and team satisfaction',
        ],
      },
      aiConfiguration: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt:
          'You are an experienced product manager with over 10 years of experience in software development projects. You are analytical, detail-oriented, and focused on delivering high-quality results while maintaining realistic timelines. You communicate directly and clearly, and make decisions based on data and stakeholder input.',
        contextWindow: 50,
      },
    });

    // Create test artifact
    testArtifact = await Artifact.create({
      name: 'test-file.pdf',
      type: 'document',
      fileInfo: {
        size: 1024,
        mimeType: 'application/pdf',
        path: '/uploads/test-file.pdf',
        originalName: 'test-file.pdf',
      },
      project: testProject._id,
      uploadedBy: testStudent._id,
    });
  });

  describe('createMilestone', () => {
    it('should create a milestone with valid data', async () => {
      const milestoneData: CreateMilestoneData = {
        project: testProject._id,
        name: 'Project Kickoff',
        description: 'Initial project milestone',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: 'deliverable',
        requirements: [
          {
            title: 'Project Plan',
            description: 'Complete project planning document',
            isRequired: true,
            type: 'file',
          },
        ],
        personaSignOffs: [testPersona._id],
      };

      const milestone = await milestoneService.createMilestone(
        milestoneData,
        testInstructor._id
      );

      expect(milestone).toBeDefined();
      expect(milestone.name).toBe('Project Kickoff');
      expect(milestone.project.toString()).toBe(testProject._id.toString());
      expect(milestone.personaSignOffs).toHaveLength(1);
      expect(milestone.personaSignOffs[0].persona.toString()).toBe(
        testPersona._id.toString()
      );
      expect(milestone.requirements).toHaveLength(1);
    });

    it('should throw error for non-existent project', async () => {
      const milestoneData: CreateMilestoneData = {
        project: new mongoose.Types.ObjectId(),
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
      };

      await expect(
        milestoneService.createMilestone(milestoneData, testInstructor._id)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error for invalid persona IDs', async () => {
      const milestoneData: CreateMilestoneData = {
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        personaSignOffs: [new mongoose.Types.ObjectId()],
      };

      await expect(
        milestoneService.createMilestone(milestoneData, testInstructor._id)
      ).rejects.toThrow(
        'One or more personas not found or do not belong to the project'
      );
    });

    it('should update project milestone count', async () => {
      const milestoneData: CreateMilestoneData = {
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
      };

      await milestoneService.createMilestone(milestoneData, testInstructor._id);

      const updatedProject = await Project.findById(testProject._id);
      expect(updatedProject?.metadata.totalMilestones).toBe(1);
    });
  });

  describe('getMilestoneById', () => {
    it('should return milestone with populated references', async () => {
      const milestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        personaSignOffs: [
          {
            persona: testPersona._id,
            status: 'pending',
          },
        ],
      });

      const result = await milestoneService.getMilestoneById(milestone._id);

      expect(result).toBeDefined();
      expect(result?._id.toString()).toBe(milestone._id.toString());
      expect(result?.project).toBeDefined();
      expect((result?.project as any).name).toBe('Test Project');
      expect(result?.personaSignOffs[0].persona).toBeDefined();
    });

    it('should return null for non-existent milestone', async () => {
      const result = await milestoneService.getMilestoneById(
        new mongoose.Types.ObjectId()
      );
      expect(result).toBeNull();
    });
  });

  describe('getMilestones', () => {
    beforeEach(async () => {
      // Create multiple milestones for testing
      await Milestone.create([
        {
          project: testProject._id,
          name: 'Milestone 1',
          description: 'First milestone',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          type: 'deliverable',
          status: 'pending',
        },
        {
          project: testProject._id,
          name: 'Milestone 2',
          description: 'Second milestone',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          type: 'review',
          status: 'in-progress',
        },
        {
          project: testProject._id,
          name: 'Overdue Milestone',
          description: 'Overdue milestone',
          dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          type: 'presentation',
          status: 'pending',
        },
      ]);
    });

    it('should return paginated milestones', async () => {
      const result = await milestoneService.getMilestones(
        {},
        { page: 1, limit: 2 }
      );

      expect(result.milestones).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should filter by project', async () => {
      const result = await milestoneService.getMilestones({
        project: testProject._id,
      });

      expect(result.milestones).toHaveLength(3);
      result.milestones.forEach(milestone => {
        expect(milestone.project.toString()).toBe(testProject._id.toString());
      });
    });

    it('should filter by status', async () => {
      const result = await milestoneService.getMilestones({
        status: 'pending',
      });

      expect(result.milestones).toHaveLength(2);
      result.milestones.forEach(milestone => {
        expect(milestone.status).toBe('pending');
      });
    });

    it('should filter by type', async () => {
      const result = await milestoneService.getMilestones({
        type: 'deliverable',
      });

      expect(result.milestones).toHaveLength(1);
      expect(result.milestones[0].type).toBe('deliverable');
    });

    it('should filter overdue milestones', async () => {
      const result = await milestoneService.getMilestones({
        overdue: true,
      });

      expect(result.milestones).toHaveLength(1);
      expect(result.milestones[0].name).toBe('Overdue Milestone');
    });

    it('should sort milestones', async () => {
      const result = await milestoneService.getMilestones(
        {},
        {
          sort: { name: 1 },
        }
      );

      expect(result.milestones[0].name).toBe('Milestone 1');
      expect(result.milestones[1].name).toBe('Milestone 2');
      expect(result.milestones[2].name).toBe('Overdue Milestone');
    });
  });

  describe('updateMilestone', () => {
    let testMilestone: any;

    beforeEach(async () => {
      testMilestone = await Milestone.create({
        project: testProject._id,
        name: 'Original Name',
        description: 'Original description',
        dueDate: new Date(),
        type: 'deliverable',
        status: 'pending',
      });
    });

    it('should update milestone successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        status: 'in-progress' as const,
      };

      const result = await milestoneService.updateMilestone(
        testMilestone._id,
        updateData,
        testInstructor._id
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Name');
      expect(result?.description).toBe('Updated description');
      expect(result?.status).toBe('in-progress');
    });

    it('should throw error for non-existent milestone', async () => {
      await expect(
        milestoneService.updateMilestone(
          new mongoose.Types.ObjectId(),
          { name: 'Test' },
          testInstructor._id
        )
      ).rejects.toThrow('Milestone not found');
    });
  });

  describe('deleteMilestone', () => {
    let testMilestone: any;

    beforeEach(async () => {
      testMilestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
      });

      // Update project milestone count
      await Project.findByIdAndUpdate(testProject._id, {
        $inc: { 'metadata.totalMilestones': 1 },
      });
    });

    it('should delete milestone successfully', async () => {
      await milestoneService.deleteMilestone(
        testMilestone._id,
        testInstructor._id
      );

      const deletedMilestone = await Milestone.findById(testMilestone._id);
      expect(deletedMilestone).toBeNull();

      const updatedProject = await Project.findById(testProject._id);
      expect(updatedProject?.metadata.totalMilestones).toBe(0);
    });

    it('should throw error for non-existent milestone', async () => {
      await expect(
        milestoneService.deleteMilestone(
          new mongoose.Types.ObjectId(),
          testInstructor._id
        )
      ).rejects.toThrow('Milestone not found');
    });
  });

  describe('updatePersonaSignOff', () => {
    let testMilestone: any;

    beforeEach(async () => {
      testMilestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        personaSignOffs: [
          {
            persona: testPersona._id,
            status: 'pending',
          },
        ],
        settings: {
          requireAllPersonaApprovals: true,
        },
      });
    });

    it('should update persona sign-off successfully', async () => {
      const signOffData: PersonaSignOffData = {
        personaId: testPersona._id,
        status: 'approved',
        feedback: 'Looks good!',
        satisfactionScore: 9,
      };

      const result = await milestoneService.updatePersonaSignOff(
        testMilestone._id,
        signOffData,
        testInstructor._id
      );

      expect(result).toBeDefined();
      expect(result?.personaSignOffs[0].status).toBe('approved');
      expect(result?.personaSignOffs[0].feedback).toBe('Looks good!');
      expect(result?.personaSignOffs[0].satisfactionScore).toBe(9);
    });

    it('should mark milestone as completed when all personas approve', async () => {
      const signOffData: PersonaSignOffData = {
        personaId: testPersona._id,
        status: 'approved',
      };

      const result = await milestoneService.updatePersonaSignOff(
        testMilestone._id,
        signOffData,
        testInstructor._id
      );

      expect(result?.status).toBe('completed');
    });

    it('should throw error for invalid persona', async () => {
      const signOffData: PersonaSignOffData = {
        personaId: new mongoose.Types.ObjectId(),
        status: 'approved',
      };

      await expect(
        milestoneService.updatePersonaSignOff(
          testMilestone._id,
          signOffData,
          testInstructor._id
        )
      ).rejects.toThrow('Persona not found or does not belong to the project');
    });

    it('should throw error for non-existent milestone', async () => {
      const signOffData: PersonaSignOffData = {
        personaId: testPersona._id,
        status: 'approved',
      };

      await expect(
        milestoneService.updatePersonaSignOff(
          new mongoose.Types.ObjectId(),
          signOffData,
          testInstructor._id
        )
      ).rejects.toThrow('Milestone not found');
    });
  });

  describe('addSubmission', () => {
    let testMilestone: any;

    beforeEach(async () => {
      testMilestone = await Milestone.create({
        project: testProject._id,
        name: 'Test Milestone',
        description: 'Test description',
        dueDate: new Date(),
        type: 'deliverable',
        status: 'pending',
      });
    });

    it('should add submission successfully', async () => {
      const submissionData: SubmissionData = {
        studentId: testStudent._id,
        artifacts: [testArtifact._id],
        description: 'My submission for this milestone',
      };

      const result = await milestoneService.addSubmission(
        testMilestone._id,
        submissionData
      );

      expect(result).toBeDefined();
      expect(result?.submissions).toHaveLength(1);
      expect(result?.submissions[0].description).toBe(
        'My submission for this milestone'
      );
      expect(result?.status).toBe('in-progress');
    });

    it('should throw error for invalid student', async () => {
      const submissionData: SubmissionData = {
        studentId: new mongoose.Types.ObjectId(),
        artifacts: [],
        description: 'Test submission',
      };

      await expect(
        milestoneService.addSubmission(testMilestone._id, submissionData)
      ).rejects.toThrow('Student not found');
    });

    it('should throw error for invalid artifacts', async () => {
      const submissionData: SubmissionData = {
        studentId: testStudent._id,
        artifacts: [new mongoose.Types.ObjectId()],
        description: 'Test submission',
      };

      await expect(
        milestoneService.addSubmission(testMilestone._id, submissionData)
      ).rejects.toThrow(
        'One or more artifacts not found or do not belong to the project'
      );
    });
  });

  describe('getProjectMilestonesSummary', () => {
    beforeEach(async () => {
      await Milestone.create([
        {
          project: testProject._id,
          name: 'Pending Milestone',
          description: 'Test',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          type: 'deliverable',
          status: 'pending',
        },
        {
          project: testProject._id,
          name: 'In Progress Milestone',
          description: 'Test',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          type: 'review',
          status: 'in-progress',
        },
        {
          project: testProject._id,
          name: 'Completed Milestone',
          description: 'Test',
          dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          type: 'presentation',
          status: 'completed',
        },
        {
          project: testProject._id,
          name: 'Overdue Milestone',
          description: 'Test',
          dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          type: 'feedback',
          status: 'pending',
        },
        {
          project: testProject._id,
          name: 'Upcoming Milestone',
          description: 'Test',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          type: 'deliverable',
          status: 'pending',
        },
      ]);
    });

    it('should return correct summary statistics', async () => {
      const summary = await milestoneService.getProjectMilestonesSummary(
        testProject._id
      );

      expect(summary.total).toBe(5);
      expect(summary.pending).toBe(3);
      expect(summary.inProgress).toBe(1);
      expect(summary.completed).toBe(1);
      expect(summary.overdue).toBe(1);
      expect(summary.upcomingDeadlines).toHaveLength(1);
      expect(summary.upcomingDeadlines[0].name).toBe('Upcoming Milestone');
    });
  });

  describe('getMilestoneAnalytics', () => {
    beforeEach(async () => {
      await Milestone.create([
        {
          project: testProject._id,
          name: 'Completed Milestone 1',
          description: 'Test',
          dueDate: new Date(),
          type: 'deliverable',
          status: 'completed',
          personaSignOffs: [
            {
              persona: testPersona._id,
              status: 'approved',
              satisfactionScore: 8,
            },
          ],
          submissions: [
            {
              student: testStudent._id,
              submittedAt: new Date(),
              status: 'approved',
            },
          ],
        },
        {
          project: testProject._id,
          name: 'Pending Milestone',
          description: 'Test',
          dueDate: new Date(),
          type: 'review',
          status: 'pending',
          personaSignOffs: [
            {
              persona: testPersona._id,
              status: 'pending',
            },
          ],
        },
      ]);
    });

    it('should return analytics data', async () => {
      const analytics = await milestoneService.getMilestoneAnalytics(
        testProject._id
      );

      expect(analytics.completionRate).toBe(50); // 1 out of 2 completed
      expect(analytics.personaEngagement).toHaveLength(1);
      expect(analytics.personaEngagement[0].signOffCount).toBe(2);
      expect(analytics.personaEngagement[0].averageSatisfaction).toBe(8);
      expect(analytics.milestoneTypeDistribution).toEqual({
        deliverable: 1,
        review: 1,
      });
      expect(analytics.submissionStats.totalSubmissions).toBe(1);
      expect(analytics.submissionStats.averageSubmissionsPerMilestone).toBe(
        0.5
      );
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      // Temporarily close the connection to simulate an error
      await mongoose.disconnect();

      await expect(milestoneService.getMilestones()).rejects.toThrow();

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });
  });
});
