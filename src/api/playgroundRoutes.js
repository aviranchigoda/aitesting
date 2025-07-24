import express from 'express';
import aiBattleArena from '../services/aiBattleArena.js';
import logger from '../utils/logger.js';
import { authMiddleware, rateLimitMiddleware } from '../middleware/security.js';

const router = express.Router();

// Register AI model for competitions
router.post('/models/register', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { modelId, modelData, publicKey, zkProof } = req.body;
    
    if (!modelId || !modelData || !publicKey || !zkProof) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: modelId, modelData, publicKey, zkProof',
        code: 'MISSING_FIELDS'
      });
    }
    
    const result = await aiBattleArena.registerAIModel(modelId, modelData, publicKey, zkProof);
    
    logger.info(`AI model registered for battles: ${modelId}`);
    res.status(201).json({
      success: true,
      data: result,
      message: 'AI model registered successfully for competitions'
    });
    
  } catch (error) {
    logger.error(`Model registration failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Model registration failed',
      details: error.message,
      code: 'REGISTRATION_FAILED'
    });
  }
});

// Create a new AI battle
router.post('/battles/create', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { contestants, dataset, metrics, prize, visibility } = req.body;
    
    if (!contestants || !Array.isArray(contestants) || contestants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 contestants required for battle',
        code: 'INSUFFICIENT_CONTESTANTS'
      });
    }
    
    if (!dataset || !metrics) {
      return res.status(400).json({
        success: false,
        error: 'Dataset and metrics are required',
        code: 'MISSING_BATTLE_CONFIG'
      });
    }
    
    const battleConfig = {
      contestants,
      dataset,
      metrics,
      prize: prize || 0,
      visibility: visibility || 'public'
    };
    
    const battleId = await aiBattleArena.createBattle(battleConfig);
    
    logger.info(`AI battle created: ${battleId}`);
    res.status(201).json({
      success: true,
      data: {
        battleId,
        contestants,
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      message: 'AI battle created successfully'
    });
    
  } catch (error) {
    logger.error(`Battle creation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Battle creation failed',
      details: error.message,
      code: 'BATTLE_CREATION_FAILED'
    });
  }
});

// Start a battle
router.post('/battles/:battleId/start', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { battleId } = req.params;
    
    const result = await aiBattleArena.startBattle(battleId);
    
    logger.info(`AI battle started: ${battleId}`);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Battle started successfully'
    });
    
  } catch (error) {
    logger.error(`Battle start failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to start battle',
      details: error.message,
      code: 'BATTLE_START_FAILED'
    });
  }
});

// Join as spectator
router.post('/battles/:battleId/spectate', async (req, res) => {
  try {
    const { battleId } = req.params;
    const { spectatorId } = req.body;
    
    if (!spectatorId) {
      return res.status(400).json({
        success: false,
        error: 'Spectator ID required',
        code: 'MISSING_SPECTATOR_ID'
      });
    }
    
    const battleState = await aiBattleArena.joinAsSpectator(battleId, spectatorId);
    
    res.status(200).json({
      success: true,
      data: battleState,
      message: 'Successfully joined as spectator'
    });
    
  } catch (error) {
    logger.error(`Spectator join failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to join as spectator',
      details: error.message,
      code: 'SPECTATOR_JOIN_FAILED'
    });
  }
});

// Get public leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = aiBattleArena.getPublicLeaderboard(limit);
    
    res.status(200).json({
      success: true,
      data: leaderboard,
      message: 'Leaderboard retrieved successfully'
    });
    
  } catch (error) {
    logger.error(`Leaderboard retrieval failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve leaderboard',
      details: error.message,
      code: 'LEADERBOARD_FAILED'
    });
  }
});

// Get active battles
router.get('/battles/active', async (req, res) => {
  try {
    const activeBattles = aiBattleArena.getActiveBattles();
    
    res.status(200).json({
      success: true,
      data: {
        battles: activeBattles,
        count: activeBattles.length
      },
      message: 'Active battles retrieved successfully'
    });
    
  } catch (error) {
    logger.error(`Active battles retrieval failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active battles',
      details: error.message,
      code: 'ACTIVE_BATTLES_FAILED'
    });
  }
});

// Get battle history
router.get('/battles/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = aiBattleArena.getBattleHistory(limit);
    
    res.status(200).json({
      success: true,
      data: {
        battles: history,
        count: history.length
      },
      message: 'Battle history retrieved successfully'
    });
    
  } catch (error) {
    logger.error(`Battle history retrieval failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve battle history',
      details: error.message,
      code: 'BATTLE_HISTORY_FAILED'
    });
  }
});

// Get real-time battle statistics
router.get('/battles/:battleId/stats', async (req, res) => {
  try {
    const { battleId } = req.params;
    const battle = aiBattleArena.activeBattles.get(battleId);
    
    if (!battle) {
      return res.status(404).json({
        success: false,
        error: 'Battle not found',
        code: 'BATTLE_NOT_FOUND'
      });
    }
    
    const stats = {
      battleId,
      status: battle.status,
      contestants: battle.contestants.length,
      spectators: battle.spectators.size,
      startTime: battle.startTime,
      endTime: battle.endTime,
      duration: battle.endTime ? battle.endTime - battle.startTime : null,
      realTimeMetrics: aiBattleArena.realTimeMetrics.get(battleId) || {}
    };
    
    res.status(200).json({
      success: true,
      data: stats,
      message: 'Battle statistics retrieved successfully'
    });
    
  } catch (error) {
    logger.error(`Battle stats retrieval failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve battle statistics',
      details: error.message,
      code: 'BATTLE_STATS_FAILED'
    });
  }
});

// AI Model Marketplace - List available models
router.get('/marketplace/models', async (req, res) => {
  try {
    const models = [];
    
    for (const [modelId, model] of aiBattleArena.modelRegistry) {
      models.push({
        id: modelId,
        trustScore: model.trustScore,
        battlesWon: model.battlesWon,
        battlesLost: model.battlesLost,
        totalScore: model.totalScore,
        capabilities: model.capabilities,
        privacyLevel: model.privacyLevel,
        registrationTime: model.registrationTime,
        quantumSignature: model.quantumSignature
      });
    }
    
    // Sort by trust score
    models.sort((a, b) => b.trustScore - a.trustScore);
    
    res.status(200).json({
      success: true,
      data: {
        models,
        totalModels: models.length,
        lastUpdated: Date.now()
      },
      message: 'AI marketplace models retrieved successfully'
    });
    
  } catch (error) {
    logger.error(`Marketplace retrieval failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve marketplace models',
      details: error.message,
      code: 'MARKETPLACE_FAILED'
    });
  }
});

// WebSocket-like real-time updates endpoint (Server-Sent Events)
router.get('/battles/:battleId/stream', async (req, res) => {
  try {
    const { battleId } = req.params;
    
    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      battleId,
      timestamp: Date.now()
    })}\n\n`);
    
    // Listen for battle events
    const eventHandler = (data) => {
      if (data.battleId === battleId) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };
    
    aiBattleArena.on('spectatorBroadcast', eventHandler);
    aiBattleArena.on('battleStarted', eventHandler);
    aiBattleArena.on('battleCompleted', eventHandler);
    
    // Handle client disconnect
    req.on('close', () => {
      aiBattleArena.removeListener('spectatorBroadcast', eventHandler);
      aiBattleArena.removeListener('battleStarted', eventHandler);
      aiBattleArena.removeListener('battleCompleted', eventHandler);
    });
    
  } catch (error) {
    logger.error(`Stream setup failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to setup real-time stream',
      details: error.message,
      code: 'STREAM_FAILED'
    });
  }
});

export default router;