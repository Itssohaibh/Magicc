'use strict';

// ==============================================
// 🔍 REAL-TIME GAME TRAFFIC ANALYZER v2.0
// ==============================================
// For authorized penetration testing of game servers
// Analyzes client-server packets for security assessment
// ==============================================

class GamePacketAnalyzer {
    constructor() {
        this.state = {
            version: '2.0',
            packets: 0,
            analyzed: 0,
            suspicious: 0,
            targets_detected: 0,
            session_start: Date.now(),
            
            // Security assessment tracking
            aim_patterns: new Map(),
            position_history: new Map(),
            weapon_usage: new Map(),
            anomalies: []
        };
        
        this.targeting_patterns = {
            headshot_threshold: 0.8,  // 80% headshots = suspicious
            perfect_accuracy: 0.99,
            rapid_fire_threshold: 0.05,  // <50ms between shots
            impossible_angles: 170      // Degrees from normal view
        };
    }

    // 📡 INTERCEPT AND ANALYZE REAL GAME PACKETS
    analyzePacket(req) {
        this.state.packets++;
        let body = {};
        
        try {
            // Parse real packet data
            if (req.body && typeof req.body === 'string') {
                body = JSON.parse(req.body);
            } else if (req.body) {
                body = req.body;
            }
            
            // 🔍 SECURITY ASSESSMENT CHECKS
            const assessment = this.assessPacketSecurity(body);
            
            // 📊 ENRICH WITH ANALYSIS DATA
            body.analysis = {
                packet_id: this.state.packets,
                timestamp: Date.now(),
                assessment: assessment,
                risk_score: this.calculateRiskScore(assessment),
                session_duration: Math.floor((Date.now() - this.state.session_start) / 1000)
            };
            
            // Track suspicious patterns
            if (assessment.risk_score > 70) {
                this.state.suspicious++;
                this.logAnomaly(body, assessment);
            }
            
            this.state.analyzed++;
            
            // Return enriched packet for proxying
            req.body = JSON.stringify(body);
            
        } catch (error) {
            console.error(`[ANALYZER] Packet ${this.state.packets} parse error:`, error.message);
            req.body = JSON.stringify({ 
                error: 'parse_failed', 
                packet: this.state.packets 
            });
        }
        
        // Live stats every 50 packets
        if (this.state.packets % 50 === 0) {
            this.displayStats();
        }
        
        return req;
    }
    
    // 🔬 DETAILED SECURITY ASSESSMENT
    assessPacketSecurity(packet) {
        const checks = {
            aim_assist: this.checkAimSuspicion(packet),
            position: this.checkPositionAnomalies(packet),
            weapon: this.checkWeaponUsage(packet),
            movement: this.checkMovementPatterns(packet),
            timing: this.checkTimingAnomalies(packet)
        };
        
        // Calculate composite scores
        const risk_score = Math.min(100, 
            (checks.aim_assist.score * 0.4) + 
            (checks.position.score * 0.2) + 
            (checks.weapon.score * 0.2) +
            (checks.movement.score * 0.1) +
            (checks.timing.score * 0.1)
        );
        
        return {
            ...checks,
            overall_risk: risk_score > 70 ? 'HIGH' : risk_score > 40 ? 'MEDIUM' : 'LOW',
            risk_score: Math.round(risk_score),
            timestamp: Date.now(),
            recommendations: this.getRecommendations(risk_score, checks)
        };
    }
    
    // 🎯 AIM PATTERN ANALYSIS
    checkAimSuspicion(packet) {
        const aimData = packet.aim_data || packet.rotation || packet.view_angles || {};
        const hitData = packet.hit || packet.damage || {};
        
        let score = 0;
        let evidence = [];
        
        // Headshot ratio check
        if (hitData.headshot && hitData.health_after === 0) {
            score += 30;
            evidence.push('Instant headshot kill');
        }
        
        // Perfect snap-to-head
        const angleDelta = this.calculateAngleDelta(aimData);
        if (angleDelta < 0.1) {  // Unrealistic precision
            score += 40;
            evidence.push(`Perfect aim snap: ${angleDelta.toFixed(3)}°`);
        }
        
        // Track player aim history
        const playerId = packet.player_id || 'unknown';
        const history = this.state.aim_patterns.get(playerId) || { total: 0, headshots: 0 };
        history.total++;
        if (hitData.headshot) history.headshots++;
        
        this.state.aim_patterns.set(playerId, history);
        
        const headshot_rate = history.headshots / history.total;
        if (headshot_rate > this.targeting_patterns.headshot_threshold) {
            score += 20;
            evidence.push(`Headshot rate: ${(headshot_rate*100).toFixed(1)}%`);
        }
        
        return { score, evidence, headshot_rate: headshot_rate || 0 };
    }
    
    // 📍 POSITION VALIDATION
    checkPositionAnomalies(packet) {
        const pos = packet.position || {};
        const playerId = packet.player_id || 'unknown';
        
        const history = this.state.position_history.get(playerId) || [];
        history.push({ ...pos, time: Date.now() });
        
        // Keep last 100 positions
        if (history.length > 100) history.shift();
        this.state.position_history.set(playerId, history);
        
        let score = 0;
        let evidence = [];
        
        // Teleport detection
        if (history.length > 1) {
            const lastPos = history[history.length - 2];
            const distance = this.calculateDistance(pos, lastPos);
            const timeDelta = (pos.time - lastPos.time) / 1000;
            
            if (distance > 50 && timeDelta < 0.1) {  // 50m in 100ms
                score += 50;
                evidence.push(`Teleport: ${distance.toFixed(1)}m in ${timeDelta.toFixed(2)}s`);
            }
        }
        
        return { score, evidence, distance_traveled: history.length > 0 ? history.length : 0 };
    }
    
    // 🔫 WEAPON USAGE ANALYSIS
    checkWeaponUsage(packet) {
        const weapon = packet.weapon || {};
        const shoot = packet.shoot || packet.fire || {};
        
        let score = 0;
        let evidence = [];
        
        // Rapid fire detection
        if (shoot.timestamp) {
            const playerId = packet.player_id || 'unknown';
            const lastShot = this.getLastShotTime(playerId);
            
            if (lastShot && (shoot.timestamp - lastShot) < 50) {  // <50ms between shots
                score += 30;
                evidence.push(`Rapid fire: ${(shoot.timestamp - lastShot).toFixed(1)}ms interval`);
            }
            
            this.recordShot(playerId, shoot.timestamp);
        }
        
        // Impossible accuracy with weapon type
        if (weapon.type === 'pistol' && packet.hit?.headshot) {
            score += 15;
            evidence.push('Pistol headshot (uncommon)');
        }
        
        return { score, evidence, weapon_type: weapon.type || 'unknown' };
    }
    
    // 🏃 MOVEMENT PATTERN CHECKS
    checkMovementPatterns(packet) {
        const movement = packet.movement || packet.velocity || {};
        let score = 0;
        let evidence = [];
        
        // Speed hack detection
        const speed = Math.sqrt(
            (movement.x || 0)**2 + 
            (movement.y || 0)**2 + 
            (movement.z || 0)**2
        );
        
        if (speed > 25) {  // >25 m/s = impossible
            score += 40;
            evidence.push(`Speed hack: ${speed.toFixed(1)} m/s`);
        }
        
        return { score, evidence, speed: speed.toFixed(1) };
    }
    
    // ⏱️ TIMING ANOMALIES
    checkTimingAnomalies(packet) {
        const now = Date.now();
        const packetTime = packet.timestamp || now;
        const latency = Math.abs(now - packetTime);
        
        let score = 0;
        let evidence = [];
        
        if (latency < 1) {  // Perfect timing (suspicious)
            score += 20;
            evidence.push(`Perfect timing: ${latency.toFixed(1)}ms latency`);
        }
        
        return { score, evidence, latency: latency.toFixed(1) };
    }
    
    // 📈 RISK SCORING & RECOMMENDATIONS
    calculateRiskScore(assessment) {
        return assessment.risk_score || 0;
    }
    
    getRecommendations(score, checks) {
        if (score > 80) {
            return [
                '🚨 IMMEDIATE BAN RECOMMENDED',
                'Implement server-side validation',
                'Rate limit packet processing',
                'Add behavioral analysis'
            ];
        } else if (score > 50) {
            return [
                '⚠️  HIGH RISK - Manual review required',
                'Enhanced monitoring recommended',
                'Check for third-party tools'
            ];
        }
        return ['✅ Normal behavior detected'];
    }
    
    // 🛠️ UTILITY FUNCTIONS
    calculateDistance(pos1, pos2) {
        return Math.sqrt(
            (pos1.x - pos2.x)**2 +
            (pos1.y - pos2.y)**2 +
            (pos1.z - pos2.z)**2
        );
    }
    
    calculateAngleDelta(aimData) {
        // Simplified angle calculation from aim data
        const angles = aimData.pitch || aimData.yaw || [0, 0];
        return Math.sqrt(angles[0]**2 + angles[1]**2);
    }
    
    getLastShotTime(playerId) {
        // Simplified - would use Redis/memcache in production
        return Date.now() - 100;  // Mock for demo
    }
    
    recordShot(playerId, timestamp) {
        // Store shot history for rate limiting analysis
    }
    
    logAnomaly(packet, assessment) {
        this.state.anomalies.push({
            packet_id: this.state.packets,
            player_id: packet.player_id || 'unknown',
            assessment,
            timestamp: Date.now()
        });
        
        if (this.state.anomalies.length > 1000) {
            this.state.anomalies.shift();
        }
    }
    
    // 📊 LIVE DASHBOARD
    displayStats() {
        const suspicious_rate = this.state.packets > 0 
            ? (this.state.suspicious / this.state.packets * 100).toFixed(1) 
            : 0;
            
        console.clear();
        console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                🔍 GAME PACKET ANALYZER v${this.state.version}                  ║
║                      PENETRATION TESTING TOOL                       ║
╚══════════════════════════════════════════════════════════════════════╝

📊 SESSION STATISTICS:
├─ Packets Analyzed: ${this.state.packets.toLocaleString()}
├─ Suspicious: ${this.state.suspicious} (${suspicious_rate}%)
├─ Risky Players: ${this.state.aim_patterns.size}
├─ Anomalies Logged: ${this.state.anomalies.length}
└─ Session Time: ${Math.floor((Date.now() - this.state.session_start)/1000)}s

🏆 TOP OFFENDERS:
${Array.from(this.state.aim_patterns.entries())
    .sort(([,a], [,b]) => (b.headshots/b.total) - (a.headshots/a.total))
    .slice(0, 5)
    .map(([id, data], i) => 
        `  ${i+1}. ${id} | ${(data.headshots/data.total*100).toFixed(1)}% HS`
    )
    .join('\n') || '  No suspicious patterns yet'}

🔍 RECENT ANOMALIES:
${this.state.anomalies.slice(-3).map(a => 
    `  [${new Date(a.timestamp).toLocaleTimeString()}] ${a.assessment.overall_risk}`
).join('\n') || '  No recent anomalies'}

${'═'.repeat(70)}
        `);
    }
}

// 🌐 PROXY MIDDLEWARE FUNCTION
function packetProxy(req, res, next) {
    const analyzer = global.gameAnalyzer || (global.gameAnalyzer = new GamePacketAnalyzer());
    
    // Only analyze game-related endpoints
    if (req.path.match(/game|match|packet|ws/)) {
        req = analyzer.analyzePacket(req);
    }
    
    next();
}

// 🚀 INITIALIZE FOR TESTING
if (require.main === module) {
    console.log('🚀 Game Packet Analyzer Ready');
    console.log('📡 Use as Express middleware: app.use(packetProxy)');
    console.log('🔗 Or test with sample packets...\n');
    
    // Test with sample packet
    const testPacket = {
        body: JSON.stringify({
            player_id: 'player_123',
            position: { x: 10.5, y: 20.1, z: 1.8 },
            aim_data: { pitch: 0.01, yaw: -0.02 },
            weapon: { type: 'ar', ammo: 30 },
            hit: { target_id: 'enemy_456', headshot: true, health_after: 0 },
            timestamp: Date.now()
        })
    };
    
    const analyzer = new GamePacketAnalyzer();
    analyzer.analyzePacket(testPacket);
}

// EXPORT FOR USE
module.exports = {
    GamePacketAnalyzer,
    packetProxy,
    analyzePacket: (req) => new GamePacketAnalyzer().analyzePacket(req)
};
