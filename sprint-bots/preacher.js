import {SPECS} from 'battlecode';

export function Preacher() {
    this.turn = preacherTurn;
    this.target = this.reflection();
}

/**
 * March across map reflection.
 */
function preacherTurn() {
    for (let i of this.getVisibleRobots()) {
        if (this.fuel > 20 &&
            i.team != this.me.team && this.dist([i.x, i.y], [this.me.x, this.me.y]) <= 4)
            return this.attack(i.x - this.me.x, i.y - this.me.y);
    }
    let route = this.path(this.target);
    if (this.fuel > 5) {
        if (route.length) {
            return this.move(...route[0]);
        } else if (this.fuel > 5) {
            return this.move(...this.randomMove());
        }
    }
}
