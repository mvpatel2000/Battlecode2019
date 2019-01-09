import {SPECS} from 'battlecode';

export function Pilgrim() {
    this.turn = pilgrimTurn;
}

function pilgrimTurn() {
    if ((this.fuel_map[this.me.y][this.me.x] && this.me.fuel < 100) || (this.karbonite_map[this.me.y][this.me.x] && this.me.karbonite < 20)) {
        return this.mine()
    } else if (false && (this.me.karbonite > 0 || this.me.fuel > 70)) {
        for (let i of this.getVisibleRobots()) {
            if (i.unit <= 1 && i.team == this.me.team && Math.abs(i.x - this.me.x) <= 1 && Math.abs(i.y - this.me.y) <= 1) {
                let dx = i.x - this.me.x;
                let dy = i.y - this.me.y;
                return this.give(dx, dy, this.me.karbonite, Math.min(50, this.me.fuel));
            }
        }
    } 
    return this.randomMove();
}
