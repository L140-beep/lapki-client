# Domain context

## Glossary

### Right sidebar

The auxiliary workspace on the right side of the application. It can show the Documentation section, the Taskbook section, or both independently. Collapsing the sidebar hides its workspace without closing either section.

### Documentation section

The Right sidebar section for browsing component reference material and project documentation.

### Taskbook section

The Right sidebar section for discovering and reading programming tasks. Closing this section does not end the current Task-solving session.

### Task catalog

The collection of programming tasks available to the user. A task becomes discoverable when its task definition is added to the catalog; it does not require registration elsewhere.

### Programming task

A named assignment for one target platform, explained by a short summary and a full description and assessed by its verification tests.

### Verification test

One independently runnable example that supplies immutable platform input and determines whether a state-machine solution satisfies part of a programming task. The user can inspect but cannot edit its input and cannot inspect its expected outcome. Every test has a finite execution limit. The State Machine Interpreter, rather than the client, determines its verdict.

For a Gardener task, a test can assess the final field and final position. For a Reader task, it assesses the ordered signal sequence.

Every test has one or more typed checks, all of which must pass. Gardener checks compare the final field or position; a Reader check compares the exact ordered output-impulse sequence.

### Output impulse

An observable answer emitted by a Reader solution through its Impulse component. Output impulses are distinct from internal state-machine events and UserSignal events. Ordinary Reader simulation and task verification expose only output impulses as called signals.

### Target platform

The platform required by a programming task and shared by all of its verification tests. Only state machines for that platform can be evaluated as solutions to the task.

### Task-solving session

The current association between one programming task and one compatible state-machine solution. Its test verdicts are separate from ordinary simulation results and become invalid when the selected solution changes. It remains current when its panels are closed and ends only when the user ends it, selects another task, or exits the application.

### Test verdict

The State Machine Interpreter's assessment of one verification test as passed or not passed. A timeout, crash, or execution error is a non-passing verdict.

### Test run

The cancellable execution of one verification test for feedback during a task-solving session. Its verdict and execution details do not replace the result of an ordinary simulation run and never contribute to solution submission. A task-solving session retains test verdicts but retains detailed outcome and execution history only for its most recent test run.

### Solution submission

The binary assessment of a task-solving session by rerunning every verification test and reporting both every test verdict and one aggregate accepted-or-not-accepted outcome. Earlier test-run verdicts are discarded and never contribute to this assessment. A failed test does not prevent the remaining tests from running. Submission results include final outcomes but not execution histories. Once confirmed and started, a submission cannot be cancelled, and its state-machine solution cannot be edited or replaced until the submission finishes. Programming tasks and submissions do not award scores.

### Active state machine

The state machine associated with the currently active editor tab. Simulation always applies to this machine and includes its unsaved changes.

### Simulation run

One isolated execution of an active state machine from its initial configuration until successful completion, a crash, a timeout, or cancellation. A new run does not inherit execution state from an earlier run.

### Endless simulation run

A simulation run that has no required final state and does not complete merely because no event is immediately available. It processes events produced by the state machine and its components, but does not accept external user signals. It has no time limit and remains active until the user cancels it, a crash occurs, or execution fails.

### Execution history

The ordered record of user-visible platform steps produced during a simulation run for playback. It is distinct from the interpreter's internal event queue and need not contain every internal state transition.

### Execution playback

The local presentation of a simulation result's execution history. Reviewing a Gardener step replaces the displayed field with that snapshot and temporarily disables environment editing. Play and pause control only this presentation and do not start, stop, or cancel a simulation run.

### Simulator

The single moving window in which a user selects a supported state machine from the current document, configures it, controls it, and observes simulation runs. It is opened from the application header and is independent from the primary workspace selection. The window is always available, even when the current document has no supported state machines. Its state-machine selection cannot change during an active simulation run.

### Primary workspace

The central application content selected independently from moving windows. The workspace model currently supports the Diagram Editor and Simulator views so another navigation surface can switch between them later. Changing away from the Diagram Editor closes its moving windows; opening the Simulator moving window does not change the primary workspace.

### Simulation configuration

The single current set of platform input values in the Simulator. It is not stored separately for each state machine. It remains applicable when selecting another machine on the same platform and resets to platform defaults when the selected platform changes.

### Simulation result

The outcome and execution history of the most recent simulation run. Selecting another state machine discards it. Editing the state-machine model after the run marks the result as stale rather than discarding it.

### Shallow history

A pseudostate that remembers the last active direct child of its owning composite state during one simulation run. Re-entering a remembered composite child follows that child's normal entry behavior. When no child has yet been remembered, the target of its unconditional outgoing transition determines the state to enter; other behavior on that transition has no effect. The absence of the transition is an error in the user's state machine.
