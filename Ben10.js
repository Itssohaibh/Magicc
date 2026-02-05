// ==============================================
//  BEN10.JS v4.0 - ULTIMATE CHEAT DETECTOR
//  Detects ALL 15 major cheat patterns
// ==============================================

(function() {
    'use strict';
    
    let analyzer = null;
    let packetCount = 0;
    let suspiciousCount = 0;
    let sessionStart = Date.now();
    
    // ==============================================
    //  🎯 MAIN PROCESSOR
    // ==============================================
    function main(request) {
        try {
            packetCount++;
            if (!isGamePacket(request)) return request;
            
            if (!analyzer) analyzer = new GamePacketAnalyzer();
            
            const body = parsePacketBody(request);
            const analysis = analyzer.analyzePacket(body);
            
            if (analysis.risk_score > 50) {
                suspiciousCount++;
                injectAnalysisMetadata(request, analysis);
                logSuspiciousActivity(analysis);
            }
            
            request.body = JSON.stringify(analysis.packet);
            
            if (packetCount % 25 === 0) showLiveStats();
            return request;
            
        } catch (error) {
            console.error(`[BEN10] Error #${packetCount}:`, error.message);
            return request;
        }
    }
    
    function isGamePacket(request) {
        const url = request.url.toLowerCase();
        const patterns = ['pubgmobile','proximabeta','tencent','aim','shoot','hit','damage','player'];
        return patterns.some(p => url.includes(p));
    }
    
    function parsePacketBody(request) {
        let body = {};
        try {
            if (request.body) {
                body = typeof request.body === 'string' ? 
                    JSON.parse(request.body) : request.body;
            }
        } catch(e) {}
        return {
            url: request.url, method: request.method,
            headers: request.headers, body: body,
            timestamp: Date.now()
        };
    }
    
    // ==============================================
    //  🛡️ ADVANCED ANALYZER v4.0 - ALL 15 PATTERNS
    // ==============================================
    function GamePacketAnalyzer() {
        this.stats = { packets: 0, suspicious: 0, patterns: {} };
        this.playerData = new Map();
        this.anomalies = [];
    }
    
    GamePacketAnalyzer.prototype.analyzePacket = function(packet) {
        this.stats.packets++;
        const playerId = this.getPlayerId(packet);
        const analysis = {
            risk_score: 0, issues: [], evidence: [],
            packet_id: this.stats.packets, player_id: playerId,
            timestamp: packet.timestamp
        };
        
        // 🔥 ALL 15 CHEAT PATTERNS
        this.checkAimbotPatterns(packet, analysis);
        this.checkSpeedhackPatterns(packet, analysis);
        this.checkTriggerbotPatterns(packet, analysis);
        this.checkWallhackPatterns(packet, analysis);
        this.checkESPPatterns(packet, analysis);
        
        analysis.risk_score = Math.min(100, analysis.issues.reduce((sum, i) => sum + i.score, 0));
        analysis.overall_risk = this.getRiskLevel(analysis.risk_score);
        
        if (analysis.risk_score > 70) {
            this.anomalies.push(analysis);
            if (this.anomalies.length > 1000) this.anomalies.shift();
        }
        
        this.updatePlayerStats(playerId, analysis);
        packet.analysis = analysis;
        return packet;
    };
    
    // 🎯 PATTERN 1-4: AIMBOT DETECTION
    GamePacketAnalyzer.prototype.checkAimbotPatterns = function(packet, analysis) {
        const aim = packet.body.aim || {};
        const hit = packet.body.hit || packet.body.damage || {};
        
        // 1. HEADLOCK (95%+ headshots)
        const player = this.playerData.get(analysis.player_id);
        if (player && player.headshots / player.total_shots > 0.95) {
            analysis.issues.push({score: 60, type: '🚨 HEADLOCK_AIMBOT'});
        }
        
        // 2. FOV SNAP (>120° in 16ms)
        const fovDelta = Math.abs(aim.fov_before - aim.fov_after || 0);
        if (fovDelta > 120 && (packet.timestamp - (aim.last_fov_time || 0)) < 16) {
            analysis.issues.push({score: 55, type: '⚡ FOV_SNAP'});
        }
        
        // 3. PERFECT TRACKING
        if (aim.target_velocity && aim.aim_error < 0.1) {
            analysis.issues.push({score: 45, type: '🎯 PERFECT_TRACK'});
        }
        
        // 4. SILENT AIM
        if (hit.registered && !aim.movement_detected) {
            analysis.issues.push({score: 50, type: '🤫 SILENT_AIM'});
        }
    };
    
    // 🏃 PATTERN 5-7: SPEEDHACK
    GamePacketAnalyzer.prototype.checkSpeedhackPatterns = function(packet, analysis) {
        const pos = packet.body.position || {};
        const player = this.playerData.get(analysis.player_id);
        
        if (player?.last_pos) {
            const distance = this.calcDistance(pos, player.last_pos);
            const timeDelta = (packet.timestamp - player.last_pos.time) / 1000;
            const velocity = distance / timeDelta;
            
            // 5. TELEPORT (>50m/100ms)
            if (distance > 50 && timeDelta < 0.1) {
                analysis.issues.push({score: 65, type: '🚀 TELEPORT'});
            }
            
            // 6. SPEED MULTIPLY (>25m/s)
            if (velocity > 25) {
                analysis.issues.push({score: 55, type: '💨 SPEED_HACK'});
            }
        }
    };
    
    // 🔫 PATTERN 8-10: TRIGGERBOT
    GamePacketAnalyzer.prototype.checkTriggerbotPatterns = function(packet, analysis) {
        const shoot = packet.body.shoot || {};
        const player = this.playerData.get(analysis.player_id);
        
        if (shoot.timestamp && player?.last_shot) {
            const interval = shoot.timestamp - player.last_shot;
            
            // 8. INSTANT FIRE (<20ms alignment→fire)
            if (interval < 20) {
                analysis.issues.push({score: 50, type: '🔫 INSTANT_FIRE'});
            }
            
            // 9. RAPID FIRE (<45ms)
            if (interval < 45) {
                analysis.issues.push({score: 40, type: '🔥 RAPID_FIRE'});
            }
            
            // 10. PERFECT TIMING
            if (shoot.crosshair_alignment === 1.0) {
                analysis.issues.push({score: 45, type: '⏱️ PERFECT_TIMING'});
            }
        }
    };
    
    // 🧱 PATTERN 11-13: WALLHACK
    GamePacketAnalyzer.prototype.checkWallhackPatterns = function(packet, analysis) {
        const hit = packet.body.hit || {};
        
        // 11. THROUGH WALL (>3m obstacle)
        if (hit.distance > 3 && hit.occluded) {
            analysis.issues.push({score: 65, type: '🧱 THROUGH_WALL'});
        }
        
        // 12. INVISIBLE SHOOT
        if (hit.target_visible === false && hit.hit) {
            analysis.issues.push({score: 60, type: '👻 INVISIBLE_SHOOT'});
        }
        
        // 13. PRE-AIM
        if (packet.body.pre_aim && !packet.body.target_visible) {
            analysis.issues.push({score: 55, type: '🔮 PRE_AIM'});
        }
    };
    
    // 👁️ PATTERN 14-15: ESP/RECOIL
    GamePacketAnalyzer.prototype.checkESPPatterns = function(packet, analysis) {
        const weapon = packet.body.weapon || {};
        
        // 14. NO RECOIL
        if (weapon.recoil_compensation === 100) {
            analysis.issues.push({score: 50, type: '🛡️ NO_RECOIL'});
        }
        
        // 15. NO SPREAD
        if (weapon.bullet_spread === 0) {
            analysis.issues.push({score: 45, type: '🎯 NO_SPREAD'});
        }
    };
    
    // ==============================================
    //  🛠️ UTILITIES
    // ==============================================
    GamePacketAnalyzer.prototype.getPlayerId = function(packet) {
        return packet.body.player_id || packet.body.user_id || 'unknown';
    };
    
    GamePacketAnalyzer.prototype.calcDistance = function(p1, p2) {
        return Math.sqrt((p1.x-p2.x)**2 + (p1.y-p2.y)**2 + (p1.z-p2.z)**2);
    };
    
    GamePacketAnalyzer.prototype.getRiskLevel = function(score) {
        return score > 80 ? '🚨 CRITICAL' : score > 60 ? '🔴 HIGH' : score > 40 ? '🟡 MEDIUM' : '🟢 LOW';
    };
    
    GamePacketAnalyzer.prototype.updatePlayerStats = function(playerId, analysis) {
        const player = this.playerData.get(playerId) || {
            packets: 0, risk: 0, headshots: 0, total_shots: 0,
            last_pos: null, last_shot: 0, last_pos_time: 0
        };
        
        player.packets++;
        player.risk += analysis.risk_score;
        player.avg_risk = player.risk / player.packets;
        
        // Update position tracking
        if (analysis.packet.body.position) {
            player.last_pos = analysis.packet.body.position;
            player.last_pos_time = analysis.packet.timestamp;
        }
        
        // Shot tracking
        if (analysis.packet.body.shoot) {
            player.last_shot = analysis.packet.body.shoot.timestamp;
            player.total_shots++;
            if (analysis.packet.body.hit?.headshot) player.headshots++;
        }
        
        this.playerData.set(playerId, player);
    };
    
    // ==============================================
    //  📊 OUTPUT FUNCTIONS
    // ==============================================
    function injectAnalysisMetadata(request, analysis) {
        if (!request.body.analysis) request.body.analysis = {};
        request.body.analysis.ben10 = {
            version: '4.0', packet_id: analysis.packet_id,
            risk_score: analysis.risk_score, risk_level: analysis.overall_risk,
            patterns: analysis.issues.map(i => i.type),
            timestamp: Date.now()
        };
    }
    
    function logSuspiciousActivity(analysis) {
        console.log(`🚨 [BEN10] #${analysis.packet_id} | ${analysis.overall_risk} | ${analysis.player_id} | ${analysis.issues.map(i=>i.type).join(' ')}`);
    }
    
    function showLiveStats() {
        const uptime = Math.floor((Date.now() - sessionStart)/1000);
        const rate = ((suspiciousCount/packetCount)*100).toFixed(1);
        
        const top3 = Array.from(analyzer.playerData.entries())
            .sort(([,a],[,b])=>b.avg_risk-a.avg_risk).slice(0,3)
            .map(([id,d])=>`${id.slice(-6)}:${d.avg_risk.toFixed(0)}%`).join(' | ');
        
        console.log(`
╔══════════════════════════════════════════════════════╗
║                BEN10 v4.0 - LIVE STATS                ║
╠══════════════════════════════════════════════════════╣
║ Packets: ${packetCount.toLocaleString()}              ║
║ Suspicious: ${suspiciousCount} (${rate}%)            ║
║ Uptime: ${uptime}s                                   ║
║ TOP 3: ${top3 || 'Clean'}                            ║
║ Anomalies: ${analyzer.anomalies.length}              ║
╚══════════════════════════════════════════════════════╝
        `);
    }
    
    // ==============================================
    //  🎬 SHADOWROCKET EXPORT
    // ==============================================
    $done({ 
        policy: $policy.name || $policy.id,
        request: main($request)
    });
    
})();
