import {SPECS} from 'battlecode';

export function Preacher() {
    this.turn = preacherTurn;
}

function preacherTurn() {
    return this.randomMove();
}
