import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireInstructor } from '../middleware/roleCheck';
import { conflictService } from '../services/conflictService';

const router = express.Router();

// List conflicts for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const conflicts = await conflictService.listProjectConflicts(projectId);
    res.json({ success: true, conflicts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate a conflict scenario
router.post('/generate', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { projectId, conversationId, participantIds, seedTopics, desiredSeverity } = req.body || {};
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }

    const conflict = await conflictService.generateConflictScenario({
      projectId,
      conversationId,
      participantIds,
      seedTopics,
      desiredSeverity,
    });

    res.status(201).json({ success: true, conflict });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Detect conflicts from recent messages
router.post('/detect', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { projectId, lookbackHours } = req.body || {};
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }
    const conflicts = await conflictService.detectConflictsFromMessages(projectId, lookbackHours);
    res.json({ success: true, conflicts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Resolve conflict
router.patch('/:conflictId/resolve', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { conflictId } = req.params;
    const { resolutionSummary } = req.body || {};
    if (!resolutionSummary) {
      return res.status(400).json({ success: false, message: 'resolutionSummary is required' });
    }

    const updated = await conflictService.resolveConflict(conflictId, resolutionSummary);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conflict not found' });
    }

    res.json({ success: true, conflict: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;