import {SPECS} from 'battlecode';

export function Church() {
    this.turn = churchTurn;
    this.step = 0;
}

function churchTurn() {
    this.step++;
    let choice = this.randomMove();
    if (this.step % 2 && this.fuel >= 150 && this.karbonite >= 10
                && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
        return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
    } else {
        return;
    }
}
