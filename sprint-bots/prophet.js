import {SPECS} from 'battlecode';

export function Prophet() {
    this.turn = prophetTurn;
}

function prophetTurn() {
    for (let i of this.getVisibleRobots()) {
        if (i.team != this.me.team && this.dist([i.x, i.y], [this.me.x, this.me.y]) <= 8
                && this.dist([i.x, i.y], [this.me.x, this.me.y]) >= 4)
            return this.attack(i.x - this.me.x, i.y - this.me.y);
    }
    if (this.fuel > 5)
        return this.move(...this.randomMove());
}
