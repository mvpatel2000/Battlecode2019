import {SPECS} from 'battlecode';

/**
 * Universal constructor called for all units.
 */
export function Unit() {
    this.spawnPoint = this.getVisibleRobots().filter(i => i.unit < 2
                        && this.distSquared([i.x, i.y], [this.me.x, this.me.y]) <= 2 && i.signal >= 0)[0];
    if (!this.spawnPoint) return;
    let sig = this.spawnPoint.signal;
    if (sig >> 15) {
        this.harasser = true;
        this.avoid = [0x1f & (sig >> 10),
                        0x1f & (sig >> 5),
                        (0x1f & sig)]
    }

    //harassers
    if (this.harasser) {
        this.resourceClusters = this.clusterResourceTiles();
        this.resourceCentroids = this.resourceClusters.map(x => this.centroid(x));
        this.avoidTup = this.avoid.map(i => this.resourceCentroids[i]).filter(i => i);
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
        let map = {};
        this.queue.forEach(i => {map[i] = this.rand(3) - 1});
        this.queue.sort((a, b) => map[a] - map[b]);
        this.log(this.queue);
        this.harassTurn = harassTurn;
    }

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
}
