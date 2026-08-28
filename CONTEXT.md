# Domain context

## Glossary

### Active state machine

The state machine associated with the currently active editor tab. Simulation always applies to this machine and includes its unsaved changes.

### Simulation run

One isolated execution of an active state machine from its initial configuration until successful completion, a crash, a timeout, or cancellation. A new run does not inherit execution state from an earlier run.

### Endless simulation run

A simulation run that has no required final state and does not complete merely because no event is immediately available. It processes events produced by the state machine and its components, but does not accept external user signals. It has no time limit and remains active until the user cancels it, a crash occurs, or execution fails.

### Execution history

The ordered record of user-visible platform steps produced during a simulation run for playback. It is distinct from the interpreter's internal event queue and need not contain every internal state transition.

### Simulator

The single workspace view in which a user selects a supported state machine from the current document, configures it, controls it, and observes simulation runs. The view is always available, even when the current document has no supported state machines. Its state-machine selection cannot change during an active simulation run.

### Simulation configuration

The single current set of platform input values in the Simulator. It is not stored separately for each state machine. It remains applicable when selecting another machine on the same platform and resets to platform defaults when the selected platform changes.

### Simulation result

The outcome and execution history of the most recent simulation run. Selecting another state machine discards it. Editing the state-machine model after the run marks the result as stale rather than discarding it.

### Shallow history

A pseudostate that remembers the last active direct child of its owning composite state during one simulation run. Re-entering a remembered composite child follows that child's normal entry behavior. When no child has yet been remembered, the target of its unconditional outgoing transition determines the state to enter; other behavior on that transition has no effect. The absence of the transition is an error in the user's state machine.
