import {SPECS} from 'battlecode';

export function Preacher() {
    this.turn = preacher_turn;
}

function preacher_turn() {
    const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    const choice = choices[Math.floor(Math.random() * choices.length)]
    return this.move(...choice);
}
