import {SPECS} from 'battlecode';

export function Church() {
    this.turn = church_turn;
    this.step = 0;
}

function church_turn() {
    this.step++;
    if (this.step % 10 === 0) {
        return this.buildUnit(SPECS.CRUSADER, 1, 1);
    } else {
        return;
    }
}
