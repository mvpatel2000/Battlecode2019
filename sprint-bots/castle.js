import {SPECS} from 'battlecode';

export function Castle() {
    this.turn = castle_turn;
    this.step = 0;
}

function castle_turn() {
    this.step++;
    if (this.step % 10 === 0) {
        return this.buildUnit(SPECS.CRUSADER, 1, 1);
    } else {
        return;
    }
}
