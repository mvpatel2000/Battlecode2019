import {SPECS} from 'battlecode';

export function Crusader() {
    this.turn = crusaderTurn;
}

function crusaderTurn() {
    return this.move(...this.randomMove());
}
