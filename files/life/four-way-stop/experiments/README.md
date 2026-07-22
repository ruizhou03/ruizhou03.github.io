# Four-way stop sensitivity experiments

These files are exploratory outputs, not engineering-design recommendations.
They extend the published-headway baseline in `simulation-results.csv` with
transparent counterfactual knobs and keep those results separate from the
article draft.

## Files

- `sensitivity-results.csv`: 484 aggregated controller/scenario rows.
- `crossover-summary.csv`: interpolated total-flow crossover for three
  one-factor-at-a-time experiments.
- `scripts/four_way_stop_sensitivity.py`: deterministic generator for both
  CSVs and all five experiment figures.

## Common design

- Four single-lane approaches and independent Poisson arrivals.
- Left/through/right baseline shares of 10%/80%/10%.
- AWSC departure headways retain the Kyte-calibrated 3.7/5.7/6.5/8.4-second
  cases used by the baseline simulation.
- Fixed signal retains a 70-second cycle, 8 seconds of lost time, and a
  2.0-second saturation headway.
- Crossover experiments use balanced approaches, flows from 900 to 2,000
  vehicles/hour in 100-vehicle increments, and 24 replications per cell.
- Two-dimensional interaction experiments use 32 replications per cell.
- Efficiency/fairness and compliance experiments use 40 replications per cell.
- Common random numbers are used wherever the arrival process can be held
  fixed across counterfactual values.

The crossover is linearly interpolated between the last tested flow where AWSC
has lower mean delay and the first tested flow where the signal has lower mean
delay. It is a model boundary, not a warrant or field threshold.

## Counterfactual knobs

### Turning shares

The baseline turn mix is centered to have zero additional headway. Relative to
that mix, a left turn adds 1.0 second to an AWSC service interval and 0.8 second
to a signal discharge interval; a right turn adds 0.15 second. These are
stylized sensitivity increments, not fitted HCM adjustment factors.

### Pedestrians

Pedestrians arrive as an occupancy probability rather than as individually
tracked agents. An 8-second crossing-occupancy window converts pedestrians per
hour into the probability that a conflict zone is occupied. A blocked vehicle
receives 4 seconds of mean residual delay. At signals, through vehicles are
treated as parallel to the pedestrian phase while turning vehicles can be
blocked. At AWSC, movement-specific exposure weights are left 0.75, through
0.25, and right 1.0.

### Simultaneous-arrival ambiguity and hesitation

The ambiguity window marks front vehicles whose recorded arrival times are
close enough to be perceived as a tie. When a tie occurs, the selected mean
hesitation is added to the next service interval with lognormal variation.
This is a behavioral proxy; a calibrated version would need stop-line video or
trajectory data.

### Stop compliance

The Kyte-calibrated headway is centered at an 80% reference full-stop rate for
this counterfactual. A full stop adds one second relative to a rolling stop.
The reported conflict-exposure proxy counts service events where a driver does
not fully stop while another approach or a pedestrian conflict is present. It
is not an accident probability or safety estimate.

### Signal priority and fairness

For a fixed 80%/20% major/minor demand split, the effective green share is
computed from demand weights raised to an exponent alpha. Alpha 0 gives equal
green, alpha 1 gives demand-proportional green, and larger alpha favors the
major street more strongly. Every street retains at least 10 seconds of green.
The resulting plot compares total mean delay with the worst approach's mean
delay and includes AWSC as a reference point.

## Interpretation rule

Large delays near the boundary are expected: a small headway penalty can push
arrival flow above service capacity. Read those cells together with throughput
and end queue. Treat factor rankings and qualitative interactions as the main
exploratory output; do not treat the exact seconds as field predictions before
calibration.
