import {SPECS} from 'battlecode';

export function Pilgrim() {
    this.turn = pilgrimTurn;
    this.queue = this.findResources();
    this.dropoffs = [];
}

function pilgrimTurn() {
    // add castles + churches to list of known drop-off points
    outer: for (let i of this.getVisibleRobots()) {
        if (i.unit <= 1 && i.team == this.me.team) {
            for (let j of this.dropoffs) {
                if (j[0] == i.x && j[1] == i.y)
                    continue outer;
            }
            this.dropoffs.push([i.x, i.y]);
        }
    }

    let [x, y] = [this.me.x, this.me.y];

    // mine if not at capacity
    if ((this.fuel_map[y][x]
                && this.me.fuel < SPECS.UNITS[this.me.unit].FUEL_CAPACITY)
            || (this.karbonite_map[y][x]
                && this.me.karbonite < SPECS.UNITS[this.me.unit].KARBONITE_CAPACITY)) {
        return this.mine()
    } else if (this.fuel_map[y][x] || this.karbonite_map[y][x]) {
        this.turn = pilgrimDropping;
        return this.turn();
    }

    if (this.getVisibleRobotMap()[this.queue[0][1]][this.queue[0][0]] > 0) {
         this.queue.push(this.queue.shift());
    }
    let route = this.path(this.queue[0]);
    if (route.length) {
        let [dx, dy] = route[0];
        return this.move(dx, dy);
    }
}

function pilgrimDropping() {
    let [x, y] = this.dropoffs.reduce((a, b) =>
        this.dist([this.me.x, this.me.y], a) < this.dist([this.me.x, this.me.y], b) ? a : b);
    let [z, w] = this.randomMove();
    let route = this.path([x + z, y + w]);
    if (route.length) {
        let [dx, dy] = route[0];
        return this.move(dx, dy);
    } else {
        if (x == this.me.x - z && y == this.me.y - w) {
            this.turn = pilgrimTurn;
            return this.give(-z, -w, this.me.karbonite, this.me.fuel);
        }
    }
}
