import {SPECS} from 'battlecode';

/**
 * Universal constructor called for all units.
 */
export function Unit() {
    this.isAssaulting = false;
    this.streak = false;
    this.spawnPoint = this.getVisibleRobots().filter(i => i.unit < 2
                        && this.distSquared([i.x, i.y], [this.me.x, this.me.y]) <= 2 && i.signal >= 0)[0];
    if (!this.spawnPoint) return;
    this.unitsBuilt = 0;
    let sig = this.spawnPoint.signal;
    if (sig >> 15) {
        //this.log(`harass signal = ${sig.toString(2)}`);
        this.harasser = true;
        this.avoid = [0x1f & (sig >> 5),
                        0x1f & (sig)]
        this.target = 0x1f & (sig >> 10);
    }

    this.pos = function() {
        return [this.me.x, this.me.y];
    };

    this.pushAnalysis = function() {
        let charge = this.getVisibleRobots().filter(i => i.team == this.me.team && (i.signal >> 12) == 0x7);
        if (charge.length > 0) {
            this.target = this.decodeExactLocation(charge[0].signal & 0xfff);
            //this.log(`attacking ${this.target}`);
        }
        this.moves = -999;
        this.isAssaulting = true;
    };

    this.endgameAnalysis = function() {
        let charge = this.getVisibleRobots().filter(i => i.team == this.me.team && (i.signal >> 12) == 0x5);
        return charge.length > 0;
    };

    //harassers
    if (this.harasser) {
        this.resourceClusters = this.clusterResourceTiles();
        this.resourceCentroids = this.resourceClusters.map(x => this.centroid(x));
        this.avoidTup = this.avoid.map(i => this.resourceCentroids[i]).filter(i => i);
        this.avoidTup.push(this.reflectPoint(...this.pos()));
        this.targetTup = this.resourceCentroids[this.target];
        this.mineTup = this.avoidTup.map(i => this.reflectPoint(...i));
        this.avoid.forEach(i => {
            this.resourceCentroids.splice(i, 1, null);
        });

        this.resourceCentroids = this.resourceCentroids.filter(i => i);
        this.queue = this.resourceCentroids.filter(i =>
            this.avoidTup.map(q => this.dist(q, i)).reduce((a, b) => a + b)
            <= this.mineTup.map(q => this.dist(q, i)).reduce((a, b) => a + b) + 8);
        this.queue = this.queue.filter(i => this.avoidTup.every(l => this.dist(l, i) > 10));
        const d = i => this.distSquared([this.me.x, this.me.y], i);
        this.queue.sort((a, b) => d(a) - d(b));
        this.queue.splice(0, 0, this.targetTup);
        //this.log(this.queue);
        this.harassTurn = harassTurn;
        this.queue.push(null);
    }


    /**
     * Turn for harass bots.
     */
    function harassTurn() {
        if (this.getVisibleRobots().map(i => i.unit == SPECS.CHURCH
            && this.dist([i.x, i.y], this.pos()) < 2).reduce((a, b) => a || b, false)) {
            //this.log('harasser redirecting');
            this.queue.push(this.queue.shift());
        }

        let attackbot = this.getRobotToAttack();
        if (attackbot && (!this.shouldRun || !this.shouldRun())) {
            if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
                return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
            }
        }

        if (this.queue[0] == null) {
            return this.go(this.avoidTup[0]);
        }
        // If there are robots that can attack me,
        // move to location that minimizes the sum of the hp damage.
        // Tiebreaker: location closest (euclidean distance) from the original path move to target
        // Fall through if no robots can attack me, or not enough fuel to move.
        let optimalmove = this.getOptimalEscapeLocationProphet();
        if (optimalmove.length && this.fuel >= (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) {
            let route = this.path(this.target);
            let [dx, dy] = route.length ? route[0] : [0, 0];
            let old = [this.me.x + dx, this.me.y + dy];
            let finmove = optimalmove.reduce((a, b) => this.dist(a, old) < this.dist(b, old) ? a : b);
            //if best possible move is to stay still, return nothing.
            if (finmove[0] == this.me.x && finmove[1] == this.me.y) {
                return;
            } else {
                return this.move(...[finmove[0] - this.me.x, finmove[1] - this.me.y]);
            }
        }

        if (!this.queue.length) {
            return;
        }
        if (this.dist(this.queue[0], [this.me.x, this.me.y]) < 2) {
            if (this.fuel_map[this.me.y][this.me.x] || this.karbonite_map[this.me.y][this.me.x]) {
               return this.move(...this.randomMove());
            } else {
                return;
            }
        }
        let route = this.avoidpath(this.queue[0], this.avoidTup, 100);
        if (route.length) {
            return this.move(...route[0]);
        } else {
            this.queue.push(this.queue.shift());
        }
    }

    /**
     * Spawns units to defense matrix
     */
    this.pumpProphets = function() {
        let numFuelSquares = this.fuel_map.filter(i => i).length;
        let numProduction = this.resourceClusters.length;
        let k = 5;
        if(this.fuel >= 4000) k++;
        if(this.karbonite >= 300) k++;
        let p = numFuelSquares*k/(numProduction*50);
        let coinflip = this.rand(10000) < 10000*p;
        let fuelThresh = 200 + 80 * this.unitsBuilt;
        // let fuelThresh = Math.min(Math.max(200, 10*this.me.turn), 5000);

        // coinflip = this.streak ? coinflip : 1;
        if (coinflip && this.fuel >= fuelThresh && this.karbonite >= 200 && this.defensePositions.length > 0
            && (!this.targetClusterIndex || this.targetClusterIndex == -1)
            && ((this.fuel >= 300 && this.karbonite >= 300) || this.rand(2) == 0)) {
            // this.log("pump");
            // this.streak = true;
            let target = [1,0];
            let choice = this.getSpawnLocation(target[0], target[1]);
            if (choice) {
                let defenseTarget = this.defensePositions.shift();
                let defenseCtr = 0; 
                while(defenseCtr < this.defensePositions.length && this.getVisibleRobotMap()[defenseTarget[1]][defenseTarget[0]] > 0) {
                    defenseTarget = this.defensePositions.shift();
                    defenseCtr++;
                }
                let vertical = this.orientation();
                let crusader = false;
                let adj = this.me.unit == SPECS.CASTLE ? 0 : 8;
                if (vertical && this.me.x > adj + this.map.length / 2) {
                    if (defenseTarget[0] > this.me.x) {
                        crusader = true;
                    }
                }
                if (vertical && this.me.x < this.map.length / 2 - adj) {
                    if (defenseTarget[0] < this.me.x) {
                        crusader = true;
                    }
                }
                if (!vertical && this.me.y > adj + this.map[0].length / 2) {
                    if (defenseTarget[1] > this.me.y) {
                        crusader = true;
                    }
                }
                if (!vertical && this.me.y < this.map[0].length / 2 - adj) {
                    if (defenseTarget[1] < this.me.y) {
                        crusader = true;
                    }
                }
                this.signal(this.encodeExactLocation(defenseTarget), 2);
                this.unitsBuilt++;
                if (crusader) {
                    return this.buildUnit(SPECS.CRUSADER, choice[0], choice[1]);
                }
                if (this.unitsBuilt > 15) {
                    if (this.rand(3))
                        return this.buildUnit(SPECS.PREACHER, choice[0], choice[1]);
                }
                return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
            }
        }
        // else if (coinflip == 1) {
        //     this.streak = false;
        // }
    }
}
