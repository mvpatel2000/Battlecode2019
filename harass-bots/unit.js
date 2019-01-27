import {SPECS} from 'battlecode';

/**
 * Universal constructor called for all units.
 */
export function Unit() {
    this.streak = false;
    this.spawnPoint = this.getVisibleRobots().filter(i => i.unit < 2
                        && this.distSquared([i.x, i.y], [this.me.x, this.me.y]) <= 2 && i.signal >= 0)[0];
    if (!this.spawnPoint) return;
    this.unitsBuilt = 0;
    let sig = this.spawnPoint.signal;
    if (sig >> 15) {
        this.log(`harass signal = ${sig.toString(2)}`);
        this.harasser = true;
        this.avoid = [0x1f & (sig >> 5),
                        0x1f & (sig)]
        this.target = 0x1f & (sig >> 10);
    }

    this.pos = function() {
        return [this.me.x, this.me.y];
    };

    this.pushAnalysis = function() {
        let charge = this.getVisibleRobots().filter(i => (i.signal >> 12) == 0x7);
        if (charge.length > 0) {
            this.target = this.decodeExactLocation(charge[0].signal & 0xfff);
        }
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
        this.log(this.queue);
        this.harassTurn = harassTurn;
    }


    /**
     * Turn for harass bots.
     */
    function harassTurn() {
        let attackbot = this.getRobotToAttack();
        if (attackbot && (!this.shouldRun || !this.shouldRun())) {
            if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
                return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
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
        let route = this.harasspath(this.queue[0], this.avoidTup);
        if (route.length) {
            return this.move(...route[0]);
        } else {
            this.queue.push(this.queue.shift());
        }
    }

    /**
     * Makes prophets + crusaders (lategame)
     */
    this.pumpProphets = function() {
        let coinflip = this.rand(4);
        coinflip = this.streak ? coinflip : 1;
        if (this.fuel >= 200 && this.karbonite >= 200 && this.defensePositions.length > 0
            && (!this.targetClusterIndex || this.targetClusterIndex == -1)
            && ((this.fuel >= 300 && this.karbonite >= 300) || coinflip == 1)) {
            this.streak = true;
            let target = [1,0];
            let choice = this.getSpawnLocation(target[0], target[1]);
            if (choice) {
                let defenseTarget = this.defensePositions.shift();
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
                    return this.buildUnit(SPECS.PREACHER, choice[0], choice[1]);
                }
                return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
            }
        } else if (coinflip == 1) {
            this.streak = false;
        }
    }
}
