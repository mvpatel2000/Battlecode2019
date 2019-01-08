import {SPECS} from 'battlecode';

export function Crusader() {
    this.turn = crusader_turn;
}

function crusader_turn() {
    const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    const choice = choices[Math.floor(Math.random() * choices.length)]
    return this.move(...choice);
}
