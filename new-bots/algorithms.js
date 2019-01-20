import {SPECS} from 'battlecode';
import {PriorityQueue} from './priorityqueue'

export const Algorithms = (function() {
    let seed = 1;

    function dist(a, b) {
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Element-wise list equality.
     */
    function arrEq(a, b) {
        return a.length == b.length && a.map((v, i) => b[i] == v).reduce((x, y) => x && y);
    }

    /**
     * Element-wise list equality. Checks if locations off by 1
     */
    function adjacentTo(a, b) {
        return Math.pow(a[0]-b[0], 2) + Math.pow(a[1]-b[1], 2) <=2;
    }

    function distSquared(a, b) {
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        return (dx * dx + dy * dy);
    }

    function getSpeed() {
        return SPECS.UNITS[this.me.unit].SPEED;
    }

    function containsCoordinate(obj, list) {
        for (let i = 0; i < list.length; i++) {
            if (list[i][0] === obj[0] && list[i][1] === obj[1]) {
                return true;
            }
        }
        return false;
    }

    /**
     * Given a squared radius
     * returns a list of all possible moves [dx,dy]
     */
    function moves(r2) {
        let steps = []
        let max = Math.sqrt(r2);
        for (let x = -max; x <= max; x++) {
            for (let y = -max; y <= max; y++) {
                if (x * x + y * y <= r2) {
                    steps.push([x, y]);
                }
            }
        }
        return steps;
    }

    /**
     * Given a squared radius, current x position, current y position
     * returns a list of all possible locations that
     * can be reached in a single move [x,y]
     */
    function absoluteMoves(r2, curx, cury) {
        let steps = []
        let max = Math.sqrt(r2);
        for (let x = -max; x <= max; x++) {
            for (let y = -max; y <= max; y++) {
                if (x * x + y * y <= r2) {
                    steps.push([x + curx, y + cury]);
                }
            }
        }
        return steps;
    }

    return {
        dist: dist,
        distSquared: distSquared,
        getSpeed: getSpeed,
        arrEq: arrEq,

        /**
         * get pseudorandom number
         */
        rand: function rand(len) {
            seed = ((seed + 3) * 7 + 37) % 8117 + this.me.x * 97
                    + this.me.y * 1013 + this.getVisibleRobots().length * 37;
            return seed % len;
        },

        /**
         * Gives list of valid move locations.
         */
        validAbsoluteMoves: function() {
            return absoluteMoves(this.getSpeed(), this.me.x, this.me.y).filter(m => !this.occupied(...m));
        },

        /**
         * Returns a move action to approach a target.
         */
        go: function(target) {
            let route = this.path(target); //path finding
            if (this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) {
                if (route.length > 0) { //A* towards target
                    return this.move(...route[0]);
                } else { //random move
                    return this.move(...this.randomMove());
                }
            }
        },

        /**
         * Helper function for aoeAnalysis method.
         * Given a 2d array from getVisibleRobotMap(), the length of the y and x-axis
         * and a given [j][i] index that might be in the 2d array, caculated
         * the damage done by an attack at the given index.
         * Returns 0 for a location outside of the visibleRobotMap array or for a location without robots.
         * Returns 1 for a location with enemy robots. Returns -1 for location with teammate.
         */
        getDamageMap: function(rbotmap, len, len0, j, i) {
            if(j>=len || j<0 || i>=len0 || i<0) {
                return 0;
            } else {
                let id = rbotmap[j][i];
                if(id>0) {
                    if(this.getRobot(id).team == this.me.team) {
                        return -1;
                    } else {
                        return 1;
                    }
                } else {
                    return 0;
                }
            }
        },

        /**
         * AOE Analysis for preacher attack.
         * A preacher, and preacher only, should call this function.
         * This returns the absolute location of the square which
         * the preacher should target with the AOE attack to the
         * maximum signed hpdamage, that is, max(hp damage to enemies - hp damage to team).
         * Returns null if all possible attack locations result in 0 or negative damage.
         */
         aoeAnalysis: function() {
             let rbotmap = this.getVisibleRobotMap();
             let aoelocation = null;
             let maxhpdamage = 0;
             let rbotmaplen = rbotmap.length;
             let rbotmaplen0 = rbotmap[0].length;
             let rad2 = 16;
             let rad = 4;

             let miny = Math.max(0, this.me.y-rad);
             let maxy = Math.min(rbotmaplen-1, this.me.y+rad);
             let minx = Math.max(0, this.me.x-rad);
             let maxx = Math.min(rbotmaplen0-1, this.me.x+rad);

             for (let j=miny; j<=maxy; j++) {
                 for (let i=minx; i<=maxx; i++) {
                     let rely = this.me.y-j;
                     let relx = this.me.x-i;
                     if ((rely*rely + relx*relx) <= rad2) {
                         if(this.map[j][i] == false || (i == this.me.x && j == this.me.y) || rbotmap[j][i]==-1) {
                             continue;
                         }
                         let hpdamage = 0;
                         for (let k=j-1; k<=j+1; k++) {
                             for (let l=i-1; l<=i+1; l++) {
                                 hpdamage += this.getDamageMap(rbotmap, rbotmaplen, rbotmaplen0, k, l);
                             }
                         }
                         if (hpdamage > maxhpdamage) {
                             maxhpdamage = hpdamage;
                             aoelocation = [i,j];
                         }
                    }
                 }
             }
             return aoelocation;
        },

        /**
         * Returns a robot to attack if possible.
         */
        getRobotToAttack: function() {
            const rad = SPECS.UNITS[this.me.unit].ATTACK_RADIUS;
            const priority = { // unit target priority tiebreakers
                0: 1,
                1: 0,
                2: 2,
                3: 3,
                4: 3,
                5: 4,
            };
            let robots = this.getVisibleRobots()
                             .filter(i =>
                                    (d => i.team != this.me.team
                                            && d >= rad[0]
                                            && d <= rad[1])(this.distSquared([i.x, i.y], [this.me.x, this.me.y])));
            if (robots.length)
                return robots.reduce((a, b) => {
                    const threat = this.threat(b) - this.threat(a);
                    const type = priority[b.unit] - priority[a.unit];
                    const id = a.id - b.id;
                    return (threat ? threat : (type ? type : id)) > 0 ? b : a;
                });
        },

        /*
         * Returns the optimal absolute location you should move to
         * by minimizing hp damage from enemy robots around you.
         * Return value: null if NO enemies are present or the
         * max hp damage by enemy robots is 0.
         */
        getOptimalEscapeLocation: function() {
            let visibleRobots = this.getVisibleRobots().filter(i => i.unit > 2 && i.team != this.me.team);
            if (visibleRobots.length == 0) {
                return [];
            }
            let minhpdamage = Infinity;
            let maxhpdamage = 0;
            let optimalmove = [];
            let possiblemoves = this.validAbsoluteMoves();
            //add "staying still" to possible moves list
            possiblemoves.push([this.me.x,this.me.y]);
            //this.log(possiblemoves.length)
            for (let move of possiblemoves) {
                let hpdamage = 0;
                for (let i of visibleRobots) {
                    let dSquaredtoEnemy = distSquared([i.x, i.y], [move[0], move[1]])
                    hpdamage += this.expectedDamage(i, dSquaredtoEnemy);
                }
                //this.log(`movr=${move} hpp=${hpdamage}`);
                if (hpdamage < minhpdamage) {
                    optimalmove = [move];
                    minhpdamage = hpdamage;
                } else if (hpdamage == minhpdamage) {
                    optimalmove.push(move);
                }
                if (hpdamage > maxhpdamage) {
                    maxhpdamage = hpdamage;
                }
            }
            if (maxhpdamage == 0) {
                return [];
            }
            return optimalmove;
        },

        /*
         * Returns move that ensures no enemies can see you
         * Used for pilgrims to kite
         */
        getOptimalHidingLocation: function() {
            let visibleRobots = this.getVisibleRobots().filter(i => i.unit > 2 && i.team != this.me.team);
            let visibleAllies = this.getVisibleRobots().filter(i => i.unit > 2 && i.team == this.me.team);
            if (visibleRobots.length == 0 || visibleAllies.length > 8) {
                return [];
            }
            let optimalmove = [];
            let possiblemoves = this.validAbsoluteMoves();
            //add "staying still" to possible moves list
            possiblemoves.unshift([this.me.x,this.me.y]);

            for (let move of possiblemoves) {
                let validmove = true;
                for (let i of visibleRobots) {
                    let dSquaredtoEnemy = distSquared([i.x, i.y], [move[0], move[1]])
                    if(dSquaredtoEnemy <=  SPECS.UNITS[i.unit].VISION_RADIUS + 1) {
                        validmove = false;
                        break;
                    }
                }
                if(validmove)
                    optimalmove.push(move);
            }
            return optimalmove;
        },

        /**
         * Given a robot, tells you if it can kill you.
         * Returns the amount of HP damage.
         */
        expectedDamageProphet: function(i, dSquared) {
            let attack_rad2 = SPECS.UNITS[i.unit].ATTACK_RADIUS;
            if (!attack_rad2) {
                return 0;
            } else {
                if (attack_rad2[0] <= dSquared && (dSquared <= attack_rad2[1] || i.unit==5 && dSquared <= attack_rad2[1]+2) ) {
                    return SPECS.UNITS[i.unit].ATTACK_DAMAGE;
                } else {
                    return 0;
                }
            }
        },

        /*
         * Returns the optimal absolute location you should move to
         * by minimizing hp damage from enemy robots around you.
         * Return value: null if NO enemies are present or the
         * max hp damage by enemy robots is 0.
         */
        getOptimalEscapeLocationProphet: function() {
            let visibleRobots = this.getVisibleRobots().filter(i => i.unit > 2 && i.team != this.me.team);
            if (visibleRobots.length == 0) {
                return [];
            }
            let minhpdamage = Infinity;
            let maxhpdamage = 0;
            let optimalmove = [];
            let possiblemoves = this.validAbsoluteMoves();
            //add "staying still" to possible moves list
            possiblemoves.push([this.me.x,this.me.y]);
            //this.log(possiblemoves.length)
            for (let move of possiblemoves) {
                let hpdamage = 0;
                for (let i of visibleRobots) {
                    let dSquaredtoEnemy = distSquared([i.x, i.y], [move[0], move[1]])
                    hpdamage += this.expectedDamageProphet(i, dSquaredtoEnemy);
                }
                //this.log(`movr=${move} hpp=${hpdamage}`);
                if (hpdamage < minhpdamage) {
                    optimalmove = [move];
                    minhpdamage = hpdamage;
                } else if (hpdamage == minhpdamage) {
                    optimalmove.push(move);
                }
                if (hpdamage > maxhpdamage) {
                    maxhpdamage = hpdamage;
                }
            }
            if (maxhpdamage == 0) {
                return [];
            }
            return optimalmove;
        },

        prepareTargets: function() {
            let enemyCastleLocations = []
            let castles = this.getVisibleRobots().filter(i => i.team == this.me.team && i.unit == 0);
            for (let i = 0; i < castles.length; i++) {
                let castle = castles[i];
                let signal = castle.signal;
                if (signal != undefined && signal!=-1) {
                    enemyCastleLocations.push(this.reflectPoint(castle.x, castle.y));
                    enemyCastleLocations.push(this.decodeLocation(signal % (2 ** 8)));
                    enemyCastleLocations.push(this.decodeLocation(Math.floor(signal / (2 ** 8))));
                    let myloc = [this.me.x, this.me.y];
                    if (this.distSquared(myloc, enemyCastleLocations[1]) < distSquared(myloc, enemyCastleLocations[0])) {
                        let a = enemyCastleLocations[0];
                        enemyCastleLocations[0] = enemyCastleLocations[1];
                        enemyCastleLocations[1] = a;
                    }
                    if (this.distSquared(myloc, enemyCastleLocations[2]) < distSquared(myloc, enemyCastleLocations[0])) {
                        let a = enemyCastleLocations[0];
                        enemyCastleLocations[0] = enemyCastleLocations[2];
                        enemyCastleLocations[2] = a;
                    }
                    if (this.distSquared(enemyCastleLocations[0], enemyCastleLocations[2]) < distSquared(enemyCastleLocations[0], enemyCastleLocations[1])) {
                        let a = enemyCastleLocations[2];
                        enemyCastleLocations[2] = enemyCastleLocations[1];
                        enemyCastleLocations[1] = a;
                    }
                    return enemyCastleLocations;
                }
            }
            let r = () => [this.rand(this.map[0].length),
                            this.rand(this.map.length)];
            let target = r();
            while (!this.map[target[1]][target[0]]) {
                target = r();
            }
            enemyCastleLocations.push(target)
            return enemyCastleLocations;
        },

        /**
         * Check nearby tiles to get mines
         * Karbonite mines are prioritized over fuel mines
         */
        getNearbyMines: function() {
            let x = this.me.x;
            let y = this.me.y;
            let mines = []
            let zonesize = 3;
            for(let dx = -zonesize; dx < zonesize+1; dx++) {
                for(let dy = -zonesize; dy<zonesize+1; dy++) {
                    if(x+dx>=0 && y+dy>=0 && x+dx<this.map.length && y+dy<this.map.length &&
                         dx*dx + dy*dy <= 13) { //within r^2
                        if(this.karbonite_map[y+dy][x+dx]) {
                            mines.unshift([x+dx, y+dy]);
                        }
                        if(this.fuel_map[y+dy][x+dx]) {
                            mines.push([x+dx, y+dy]);
                        }
                    }
                }
            }
            return mines;
        },

        /**
         * Returns the zone # from x,y
         * current implementation: 8-bit integer, so we can
         * encode 2 zones in 1 comm (the two castles that
         * the attacker is not spawned in) plus extra info
         * first 4 bits: x coord
         * second 4 bits: y coord
         */
        encodeLocation: function(x, y, xbits, ybits) {
            if (typeof(xbits)==='undefined') xbits = 8;
            if (typeof(ybits)==='undefined') ybits = 8;
            let sz = this.fuel_map.length;
            return ybits * Math.floor(x * xbits / sz) + Math.floor(y * ybits / sz);
        },

        /**
         * Returns x,y from the zone #
         */
        decodeLocation: function(zone, xbits, ybits) {
            if (typeof(xbits)==='undefined') xbits = 8;
            if (typeof(ybits)==='undefined') ybits = 8;
            let sz = this.fuel_map.length;
            let x = Math.floor(0.5 + (Math.floor(zone / ybits) + 0.5) * sz / xbits);
            let y = Math.floor(0.5 + ((zone%ybits) + 0.5) * sz / ybits);
            return this.nearestEmptyLocation(x, y);
        },

        /**
         * Encodes exact location into 12 bits
         * location[0] = x, location[y] = 1
         */
         encodeExactLocation: function(location) {
            return location[0]*64 + location[1];
         },

         /**
         * Decodes exact location into 12 bits
         */
         decodeExactLocation: function(zone) {
            return [ Math.floor(zone / 64) % 64, zone % 64];
         },

        /**
         * Returns x,y nearby that is empty
         */
        nearestEmptyLocation: function(x, y) {
            let sz = this.fuel_map.length;
            let map = this.map;
            if (map[y][x])
                return [x, y];
            for (let dx = -1; dx<2; dx++) {
                for (let dy = -1; dy<2; dy++) {
                    if (y + dy >= 0 && x + dx >= 0 && y + dy < sz && x + dx < sz && map[y + dy][x + dx])
                        return [x + dx, y + dy];
                }
            }
        },

        /**
         * Returns the reflected position of castles across the map.
         */
        reflectPoint: function(x, y) {
            let vertical = this.fuel_map.every(
                                r => r.slice(0, r.length / 2)
                                .map((v, i) => r[r.length - i - 1] == v)
                                .reduce((a, b) => a && b));
            if (vertical) {
                return [this.fuel_map[0].length - x - 1, y];
            } else {
                return [x, this.fuel_map.length - y - 1];
            }
        },

        /**
         * Returns the reflected position of castles across the map.
         */
        reflection: function() {
            let vertical = this.fuel_map.every(
                                r => r.slice(0, r.length / 2)
                                .map((v, i) => r[r.length - i - 1] == v)
                                .reduce((a, b) => a && b));
            if (vertical) {
                return [this.fuel_map[0].length - this.me.x - 1, this.me.y];
            } else {
                return [this.me.x, this.fuel_map.length - this.me.y - 1];
            }
        },

        occupied: function(x, y) {
            try {
                return !this.map[y][x] || this.getVisibleRobotMap()[y][x] != 0;
            } catch (e) {
                return true;
            }
        },

        /**
         * Run expectedDamage with current location.
         */
        threat: function(r) {
            return this.expectedDamage(r, this.distSquared([this.me.x, this.me.y], [r.x, r.y]));
        },

        /**
         * Given a robot, tells you if it can kill you.
         * Returns the amount of HP damage.
         */
        expectedDamage: function(i, dSquared) {
            let attack_rad2 = SPECS.UNITS[i.unit].ATTACK_RADIUS;
            if (!attack_rad2) {
                return 0;
            } else {
                if (attack_rad2[0] <= dSquared && dSquared <= attack_rad2[1]) {
                    return SPECS.UNITS[i.unit].ATTACK_DAMAGE;
                } else {
                    return 0;
                }
            }
        },

        /**
         * Get list of resources ordered by nearness.
         */
        findResources: function() {
            let map1 = this.fuel_map;
            let map2 = this.karbonite_map;
            let x = this.me.x;
            let y = this.me.y;
            let pos = [];
            for (let i = 0; i < map1.length; i++) {
                for (let j = 0; j < map1.length; j++) {
                    if (map1[j][i] || map2[j][i])
                        pos.push([distSquared([x, y], [i, j]), [i, j]]);
                }
            }
            return pos.sort((a, b) => a[0] - b[0]).map(x => x[1]);
        },

        findNearestClusterIndex: function(point, clusters) {
            let minScore = 7939; // R^2; this is 2*63^2 + 1
            let target = -1;
            for (let i = 0; i < clusters.length; i++) {
                let d = this.distSquared(centroid(clusters[i]), point);
                if (d < minScore) {
                    minScore = d;
                    target = i;
                }
            }
            return target;
        },

        /**
         * returns a list of clusters
         * each cluster is a list of tuples [x,y,t] where [x,y] is the resource loc,
         * t = true if karbonite, false if fuel
         */
        clusterResourceTiles: function() {
            const placesToLook = [[-2, 1], [-2, 0], [-2, -1], [-1, 2], [-1, 1], [-1, 0], [-1, -1], [-1, -2],
                [0, 2], [0, 1], [0, -1], [0, -2], [1, 2], [1, 1], [1, 0], [1, -1], [1, -2], [2, 1], [2, 0], [2, -1]];
            let fmap = this.fuel_map;
            let kmap = this.karbonite_map;
            let sz = fmap.length;
            let clustered = new Array(sz).fill(0).map(x => new Array(sz).fill(false));
            let clusters = new Array();

            for(let i = 0; i < sz; i++) {
                for(let j = 0; j < sz; j++) {
                    if(!clustered[j][i] && (fmap[j][i] || kmap[j][i])) {
                        clustered[j][i] = true;
                        let searchQueue = [];
                        searchQueue.push([i, j]);
                        let cluster = [[i,j]];
                        while(searchQueue.length > 0) {
                            let currentLoc = searchQueue[0];
                            searchQueue.shift(); // O(n) but should be ok
                            for(let k = 0; k < placesToLook.length; k++) {
                                let delta = placesToLook[k];
                                let newi = i + delta[0];
                                let newj = j + delta[1];
                                if(0 <= newi && newi < sz && 0 <= newj && newj < sz
                                    && (fmap[newj][newi] || kmap[newj][newi]) && !clustered[newj][newi]) {
                                    searchQueue.push([newi, newj]);
                                    cluster.push([newi, newj]);
                                    clustered[newj][newi] = true;
                                }
                            }
                        }
                        clusters.push(cluster);
                    }
                }
            }
            return clusters;
        },

        /**
         * given a list of points, compute their centroid rounded to the nearest integer.
         */
        centroid: function(cluster) {
            let xsum = 0;
            let ysum = 0;
            for (let i = 0; i < cluster.length; i++) {
                xsum += cluster[i][0];
                ysum += cluster[i][1];
            }
            return [Math.floor((xsum / cluster.length) + 0.5), Math.floor((ysum / cluster.length) + 0.5)];
        },


        /**
         *
         */
        reflectClusterByIndex: function(i, clusters) {
            let cluster = clusters[i];
            let reflected = this.reflectPoint(cluster[0][0], cluster[0][1]);
            for(let j = 0; j < clusters.length; j++) {
                for(let k = 0; k < clusters[j].length; k++) {
                    if(clusters[j][k][0] == reflected[0] && clusters[j][k][1] == reflected[1])
                        return j;
                }
            }
            return i; // shouldn't actually need to be called but why not
        },

        /**
         * Return optimal spawn location (as a one-tile move) towards a destination (x, y)
         * Returns null if all 8 locations are occupied
         */
        getSpawnLocation: function(x, y) {
            const choices = [[1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1], [0,-1], [1,-1]];
            let optimalIndex = Math.floor((4 * (Math.atan2(y - this.me.y,x - this.me.x) / Math.PI)) + 8.5) % 8;
            let choice = choices[optimalIndex];
            if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1]))
                return choice;
            for (let i = 1; i <= 4; i++) {
                choice = choices[(optimalIndex + 1) % 8];
                if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1]))
                    return choice;
                choice = choices[(optimalIndex + (8 - i)) % 8];
                if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1]))
                    return choice;
            }
            return null;
        },

        /**
         * Return optimal spawn location (as a one-tile move) towards a destination (x, y)
         * Returns null if all 8 locations are occupied
         */
        getChurchSpawnLocation: function(x, y) {
            const choices = [[1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1], [0,-1], [1,-1]];
            let optimalIndex = Math.floor((4*(Math.atan2(y-this.me.y,x-this.me.x)/Math.PI))+8.5) % 8;
            let choice = choices[optimalIndex];
            if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1])
                && !this.karbonite_map[this.me.y + choice[1]][this.me.x + choice[0]]
                && !this.fuel_map[this.me.y + choice[1]][this.me.x + choice[0]])
                return choice;
            for (let i = 1; i <= 4; i++) {
                choice = choices[(optimalIndex + 1) % 8];
                if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1])
                    && !this.karbonite_map[this.me.y + choice[1]][this.me.x + choice[0]]
                    && !this.fuel_map[this.me.y + choice[1]][this.me.x + choice[0]])
                    return choice;
                choice = choices[(optimalIndex+(8 - i)) % 8];
                if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1])
                    && !this.karbonite_map[this.me.y + choice[1]][this.me.x + choice[0]]
                    && !this.fuel_map[this.me.y + choice[1]][this.me.x + choice[0]])
                    return choice;
            }
            return null;
        },

        /**
         * Return random, valid, one-tile move.
         */
        randomMove: function() {
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            let choice = choices[this.rand(choices.length)]
            for (;;) {
                let locx = this.me.x + choice[0];
                let locy = this.me.y + choice[1];
                if (!this.occupied(locx, locy))
                    break;
                choice = choices[this.rand(choices.length)];
            }
            return choice;
        },

        /**
         * Return a random, valid, move within a given radius^2.
         */
        randomMoveRadiusSquared: function(r2) {
            if (r2 < 1) {
                return [0, 0];
            }
            let choices = [];
            let max = Math.sqrt(r2);
            for (let x = -max; x <= max; x++) {
                for (let y = -max; y <= max; y++) {
                    if (x * x + y * y <= r2) {
                        choices.push([x, y]);
                    }
                }
            }
            let choice = choices[this.rand(choices.length)]
            for (;;) {
                let locx = this.me.x + choice[0];
                let locy = this.me.y + choice[1];
                if (!this.occupied(locx, locy))
                    break;
                choice = choices[this.rand(choices.length)];
            }
            return choice;
        },

        /**
         * Takes in destination [x, y].
         * Return a list of [dx, dy] instructions to get from current location to destination.
         */
        path: function(dest) {
            let start = [this.me.x, this.me.y];
            let map = this.map;
            let occupied = this.getVisibleRobotMap();
            if (dest[1] >= map.length
                || dest[0] >= map[0].length
                || dest[1] < 0
                || dest[0] < 0
                || !map[dest[1]][dest[0]]
                || occupied[dest[1]][dest[0]] > 0) {
                return [];
            }
            let openHash = {};
            let done = new PriorityQueue((a, b) => h(a) < h(b));
            let prev = {}; //used to reconstruct map
            let h = x => (Math.abs(dest[0] - x[0]) + Math.abs(dest[1] - x[1])) / getSpeed.call(this); //~steps away from destination
            let hash = p => p[0] * 67 * 73 + p[1];
            let g = {}; //distance from origin in terms of steps taken
            g[start] = 0;
            let f = {}; //g + heuristic (dist to destination)
            f[start] = h(start);

            const queue = new PriorityQueue((a, b) => f[a] < f[b]);
            queue.push(start);
            let i = 128;
            while (!queue.isEmpty()) {
                let current = queue.pop(); //pop from priority queue instead of magic symbols
                done.push(current)
                if (i-- < 0 || arrEq(current, dest)) { //found destination
                    if (i < 0)
                        current = done.pop();
                    let totalPath = [current];
                    while (current in prev) { //reconstruct path
                        current = prev[current];
                        totalPath.push(current);
                    }
                    let path = [];
                    for (let i = 1; i < totalPath.length; i++) { //reformat path
                        let [a, b] = totalPath[i];
                        let [c, d] = totalPath[i - 1];
                        path.push([c - a, d - b]);
                    }
                    path.reverse();
                    return path;
                }
                for (let neighbor of absoluteMoves(getSpeed.call(this), current[0], current[1])) { //loops over all moves
                    if (neighbor[1] >= map.length
                            || neighbor[0] >= map[0].length
                            || neighbor[1] < 0
                            || neighbor[0] < 0
                            || !map[neighbor[1]][neighbor[0]]
                            || occupied[neighbor[1]][neighbor[0]] > 0
                            || openHash[hash(neighbor)]
                            || g[neighbor] != undefined) //filters invalid moves or already taken moves
                        continue;
                    queue.push(neighbor); //push
                    openHash[hash(neighbor)] = true;
                    prev[neighbor] = current; //sets current path for backtrace
                    g[neighbor] = g[current] + 1;
                    f[neighbor] = g[neighbor] + h(neighbor);
                }
            }
            return [];
        },

        /**
         * Takes in destination [x, y].
         * Return a list of [dx, dy] instructions to get from current location to destination.
         */
        workerpath: function(dest) {
            let start = [this.me.x, this.me.y];
            let map = this.map;
            let occupied = this.getVisibleRobotMap();
            if (dest[1] >= map.length
                || dest[0] >= map[0].length
                || dest[1] < 0
                || dest[0] < 0) {
                return [];
            }
            let openHash = {};
            let done = new PriorityQueue((a, b) => h(a) < h(b));
            let prev = {}; //used to reconstruct map
            let h = x => (Math.abs(dest[0] - x[0]) + Math.abs(dest[1] - x[1])) / getSpeed.call(this); //~steps away from destination
            let hash = p => p[0] * 67 * 73 + p[1];
            let g = {}; //distance from origin in terms of steps taken
            g[start] = 0;
            let f = {}; //g + heuristic (dist to destination)
            f[start] = h(start);

            const queue = new PriorityQueue((a, b) => f[a] < f[b]);
            queue.push(start);
            let i = 128;
            while (!queue.isEmpty()) {
                let current = queue.pop(); //pop from priority queue instead of magic symbols
                done.push(current)
                if (i-- < 0 || adjacentTo(current, dest)) { //found destination
                    if (i < 0)
                        current = done.pop();
                    let totalPath = [current];
                    while (current in prev) { //reconstruct path
                        current = prev[current];
                        totalPath.push(current);
                    }
                    let path = [];
                    for (let i = 1; i < totalPath.length; i++) { //reformat path
                        let [a, b] = totalPath[i];
                        let [c, d] = totalPath[i - 1];
                        path.push([c - a, d - b]);
                    }
                    path.reverse();
                    return path;
                }
                for (let neighbor of absoluteMoves(getSpeed.call(this), current[0], current[1])) { //loops over all moves
                    if (neighbor[1] >= map.length
                            || neighbor[0] >= map[0].length
                            || neighbor[1] < 0
                            || neighbor[0] < 0
                            || !map[neighbor[1]][neighbor[0]]
                            || occupied[neighbor[1]][neighbor[0]] > 0
                            || openHash[hash(neighbor)]
                            || g[neighbor] != undefined) //filters invalid moves or already taken moves
                        continue;
                    queue.push(neighbor); //push
                    openHash[hash(neighbor)] = true;
                    prev[neighbor] = current; //sets current path for backtrace
                    g[neighbor] = g[current] + 1;
                    f[neighbor] = g[neighbor] + h(neighbor);
                }
            }
            return [];
        },
    }
})();
