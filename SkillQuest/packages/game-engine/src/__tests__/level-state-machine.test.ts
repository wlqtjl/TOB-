import { describe, it, expect } from 'vitest';
import { LevelStateMachine } from '../level-state-machine';
import type { LevelNode } from '@skillquest/types';

const makeLevels = (): LevelNode[] => [
  {
    id: 'l1', courseId: 'c1', title: 'Level 1', description: '', type: 'quiz',
    status: 'passed', stars: 3, prerequisites: [], position: { x: 0, y: 0 },
    questionIds: ['q1'], timeLimitSec: 120,
  },
  {
    id: 'l2', courseId: 'c1', title: 'Level 2', description: '', type: 'topology',
    status: 'locked', stars: 0, prerequisites: ['l1'], position: { x: 200, y: 0 },
    questionIds: ['q2'], timeLimitSec: 0,
  },
  {
    id: 'l3', courseId: 'c1', title: 'Level 3', description: '', type: 'scenario',
    status: 'locked', stars: 0, prerequisites: ['l1', 'l2'], position: { x: 400, y: 0 },
    questionIds: ['q3'], timeLimitSec: 180,
  },
];

describe('LevelStateMachine', () => {
  it('unlocks level when prerequisites are passed', () => {
    const machine = new LevelStateMachine(makeLevels());
    const unlocked = machine.unlockAvailable();

    expect(unlocked).toContain('l2');
    expect(unlocked).not.toContain('l3'); // l3 needs l2 passed too
  });

  it('starts a level', () => {
    const machine = new LevelStateMachine(makeLevels());
    machine.unlockAvailable();
    expect(machine.startLevel('l2')).toBe(true);
    expect(machine.getLevel('l2')?.status).toBe('in_progress');
  });

  it('passes a level and unlocks dependents', () => {
    const machine = new LevelStateMachine(makeLevels());
    machine.unlockAvailable();
    machine.startLevel('l2');
    const newlyUnlocked = machine.passLevel('l2', 2);

    expect(machine.getLevel('l2')?.status).toBe('passed');
    expect(machine.getLevel('l2')?.stars).toBe(2);
    expect(newlyUnlocked).toContain('l3');
  });

  it('fails a level and reverts to unlocked', () => {
    const machine = new LevelStateMachine(makeLevels());
    machine.unlockAvailable();
    machine.startLevel('l2');
    machine.failLevel('l2');
    expect(machine.getLevel('l2')?.status).toBe('unlocked');
  });

  it('generates map data with correct edges', () => {
    const machine = new LevelStateMachine(makeLevels());
    machine.unlockAvailable();
    const mapData = machine.generateMapData('c1');

    expect(mapData.nodes.length).toBe(3);
    expect(mapData.edges.length).toBe(3); // l1->l2, l1->l3, l2->l3
  });
});
