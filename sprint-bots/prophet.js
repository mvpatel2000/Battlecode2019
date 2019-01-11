import {SPECS} from 'battlecode';

export function Prophet() {
    this.turn = prophetTurn;
    this.target = this.reflection();
}

/**
 * March across map reflection.
 */
function prophetTurn() {

    // attack code
    for (let i of this.getVisibleRobots()) {
        if (this.fuel > 20 && i.team != this.me.team && this.dist([i.x, i.y], [this.me.x, this.me.y]) <= 8
                                   && this.dist([i.x, i.y], [this.me.x, this.me.y]) >= 4)
            return this.attack(i.x - this.me.x, i.y - this.me.y);
    }

    // movement code
    let route = this.path(this.target);
    if (this.fuel > 5) {
        if (route.length > 0) { //A* towards target
            return this.move(...route[0]);
        } else { //random move
            return this.move(...this.randomMove());
        }
    }
}