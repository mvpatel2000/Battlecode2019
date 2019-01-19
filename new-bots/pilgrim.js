import {SPECS} from 'battlecode';

export function Pilgrim() {
    this.turn = pilgrimTurn;
    this spawnPoint = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
        Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && this.signal>=0)[0];
    this.base = [spawnPoint.x, spawnPoint.y];
    this.mine = this.decodeExactLocation(spawnPoint.signal);
    this.destination = this.mine;
}

function pilgrimTurn() {
    let [x, y] = [this.me.x, this.me.y];

    //if bad guys, run away
    //elif at target
        //if not at capacity, mine
        //if at capacity, move to base
    // elif target is base and adjacent
        //drop off
    //else workerpath

    // mine if not at capacity
    if (x == this.queue[0][0] && y == this.queue[0][1] && (this.fuel_map[y][x]
                && this.me.fuel < SPECS.UNITS[this.me.unit].FUEL_CAPACITY)
            || (this.karbonite_map[y][x]
                && this.me.karbonite < SPECS.UNITS[this.me.unit].KARBONITE_CAPACITY)) {
        // values should be modified as necessary - churches seem to hurt more than help in
        // general.
        if (this.karbonite >= 50 && this.fuel >= 200 && this.me.turn > 20
                                 && this.getVisibleRobots().every(i => i.unit > 1)) {
            let move = this.randomMove()
            if (!this.karbonite_map[this.me.y + move[1]][this.me.x + move[0]]
                    && !this.fuel_map[this.me.y + move[1]][this.me.x + move[0]]) {
                return this.buildUnit(SPECS.CHURCH, move[0], move[1]);
            } else {
                if (this.fuel > 5)
                    return this.mine();
                else
                    return;
            }
        } else {
            if (this.fuel > 5)
                return this.mine();
            else
                return;
        }
    } else if (this.fuel_map[y][x] || this.karbonite_map[y][x]) { // if done mining, return
        this.turn = pilgrimDropping;
        return this.turn();
    }
    // get new location if full
    if (this.getVisibleRobotMap()[this.queue[0][1]][this.queue[0][0]] > 0) {
         this.queue.push(this.queue.shift());
    }
    return this.go(this.queue[0]);
}

/**
 * Called in place of pilgrimTurn() when dropping off resources.
 */
function pilgrimDropping() {
    this.findDropoffs();
    if (this.dropoffs.length == 0) {
        return this.move(...this.randomMove());
    }
    // return to normal turn function
    let restore = () => {
        if (this.karbonite < 25 && !this.karbonite_map[this.queue[0][1]][this.queue[0][0]]) {
            while (!this.karbonite_map[this.queue[0][1]][this.queue[0][0]])
                this.queue.push(this.queue.shift()); // cycle if mining fuel when needing karbonite
        } else if (this.fuel < 100 && !this.fuel_map[this.queue[0][1]][this.queue[0][0]]) {
            while (!this.fuel_map[this.queue[0][1]][this.queue[0][0]])
                this.queue.push(this.queue.shift()); // the opposite
        }
        this.turn = pilgrimTurn;
    }
    let [x, y] = this.dropoffs.reduce((a, b) =>
        this.dist([this.me.x, this.me.y], a) < this.dist([this.me.x, this.me.y], b) ? a : b);
    let [z, w] = this.randomMove.call({ // center move on castle
        occupied: (x, y) =>
                    y < 0 || x < 0 || y >= this.map.length
                            || x >= this.map[0].length || !this.map[y][x],
        rand: this.rand.bind(this),
        me: {x: x, y: y},
    });
    for (let i of this.getVisibleRobots()) {
        if (i.unit <= 1 && i.team == this.me.team
                && Math.abs(i.x - this.me.x) <= 1
                && Math.abs(i.y - this.me.y) <= 1) {
            restore();
            if (this.occupied(i.x, i.y))
                return this.give(i.x - this.me.x, i.y - this.me.y, this.me.karbonite, this.me.fuel);
            else return;
        }
    }
    let route = this.path([x + z, y + w]);
    if (route.length && this.fuel > 5) {
        let [dx, dy] = route[0];
        return this.move(dx, dy);
    } else {
        if (x == this.me.x - z && y == this.me.y - w) {
            restore();
            if (this.occupied(x, y))
                return this.give(-z, -w, this.me.karbonite, this.me.fuel);
            else
                return;
        }
    }
}
