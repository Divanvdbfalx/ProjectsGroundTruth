# SAWEM Research Summary for Wind Power Forecasters

## Scope and intent
This summary synthesizes the SAWEM research pack into the practical topics wind power forecasters should prioritize now. The lens is not generic market theory; it is where forecast quality, speed, and operational integration will directly create value (or avoid losses) in the SAWEM launch and transition phases.

## Executive takeaways
- Forecasting moves from a planning support function to a direct P&L lever under BRP obligations.
- Generators above 10 MW are expected to be BRPs (or designate one), so forecast error has explicit balancing cash consequences.
- Day-ahead performance is mandatory at launch; intra-day adjustment capability is a near-term edge as SAWEM functionality matures.
- Reserve/ancillary participation and constrained redispatch dynamics make probabilistic, flexibility-aware forecasting materially more valuable than point forecasts alone.
- Metering, data quality, and settlement readiness are as important as model skill; weak operational data pipelines can erase model gains.

## 1) BRP accountability is the central commercial signal
Across the Market Code draft and SAWEM role notes, BRPs are responsible for matching forecasted and actual delivery/consumption and settling imbalances. For wind operators this is the key market shift: forecast variance becomes a priced exposure, not just an internal KPI.

Why it matters to wind forecasters:
- Wind forecast error translates into under/over-delivery against nominations.
- Under-delivery can force balancing energy purchases above reference prices; over-delivery can reduce value capture depending on balancing pricing and instruction status.
- The readiness material repeatedly references an initial tolerance/penalty concept (e.g., 5% tolerance in presentation framing), with movement toward more market-driven balancing pricing.

Exploit opportunity:
- Sell or deploy BRP-focused forecast products that optimize expected balancing cost, not only MAE/RMSE.
- Build a “nomination optimizer” that converts probabilistic wind output into risk-adjusted bids/nominations by hour.

## 2) Day-ahead process discipline will separate winners early
The SAWEM documentation repeatedly anchors to day-ahead schedules and bid deadlines (including 10:00 day-before processes in both role notes and draft code sections). Forecast operations must therefore be industrialized to produce reliable, auditable D-1 outputs every day.

What forecasters should operationalize:
- 24-hour trading-period forecasts with confidence bands.
- Indicative multi-day outlooks (the framework repeatedly references forward indicative schedules/forecasts).
- Cutoff-aware production: model refresh, QA, nomination packaging, and approval must complete before market gate closure.

Exploit opportunity:
- Build a “gate-closure reliability stack”: automated forecast generation, anomaly detection, scenario stress tests, and nomination handoff with timestamps and audit trails.
- Productize reliability SLAs around deadline success and revision quality.

## 3) Intra-day capability is a high-value upgrade path
The draft code and concept material indicate regular intra-day auction cycles and schedule updates (with multiple intraday gate closures). Even where full functionality is phased, the direction is clear: late information can be monetized through rescheduling and imbalance reduction.

What to prepare now:
- Nowcasting layer (0-6h horizon) separate from day-ahead core.
- Fast update cadence tied to intraday gate windows.
- Change-detection logic (front movements, ramp risk, curtailment signals) triggering bid/schedule revisions.

Exploit opportunity:
- Offer “intraday rescue” analytics: expected imbalance reduction from each rebid opportunity.
- Provide recommendation engines for when not to rebid (to avoid overtrading noise).

## 4) Co-optimization of energy and reserves changes forecast design requirements
The South African market design material emphasizes co-optimization of energy and reserves and highlights reserve categories (regulating, instantaneous, ten-minute). This means wind forecasting value is not limited to MWh volume prediction.

Forecaster implications:
- Need availability/flexibility-aware forecasts (what can actually be delivered under reserve commitments and constraints).
- Need uncertainty quantification that supports reserve qualification and dispatch confidence.
- Need plant-level and portfolio-level views to support reserve and balancing decisions.

Exploit opportunity:
- Develop “flexibility forecasts” (expected upward/downward maneuverability) in addition to output forecasts.
- Provide ancillary-readiness scoring for participation decisions.

## 5) Constrained dispatch and network effects must be forecasted, not treated as exogenous noise
The market descriptions and role notes emphasize constrained redispatch, network limitations, and wheeling constraints. A pure weather-to-MWh model is insufficient in a market where physical constraints affect settlement outcomes and opportunity costs.

What to include in forecasting strategy:
- Constraint-aware expected delivery (not just unconstrained generation potential).
- Congestion/constrained-risk indicators by node/zone where feasible.
- Contract-aware dispatch scenarios for bilateral-plus-market portfolios.

Exploit opportunity:
- Build “constrained value at risk” dashboards to quantify expected schedule reductions and resulting settlement impact.
- Use this to improve offer shaping and bilateral contract renegotiation priorities.

## 6) Bilaterals + SAWEM integration is a forecasting monetization opportunity
The bilateral contracts concept note is explicit: existing contracts may constrain market responsiveness, but parties can improve outcomes by aligning contract terms, BRP assignment, and SAWEM participation. For wind players, forecasting can become the operational bridge between bilateral commitments and market optimization.

Practical implications:
- PPAs with restrictive clauses (take-or-pay, first-right provisions) can limit response to favorable market intervals.
- Parties may still trade excess capacity or ancillary capability where contract structures allow.
- BRP accountability persists for relevant participants even outside full market participation pathways.

Exploit opportunity:
- Introduce “contract-aware forecast dispatch”: recommend when to fulfill via contracted energy vs market purchases/sales.
- Quantify expected benefit of contract amendments using historical forecast/price simulations.

## 7) CPA/CfD transition logic means forecast quality still matters under hedging
The CPA and CfD research papers make clear that hedging/vesting can smooth revenue and support transition, but they do not eliminate the operational need for good forecasts. Even where prices are hedged, market participation, balancing behavior, and cash-flow/shortfall dynamics remain sensitive to forecast quality.

What to internalize:
- Hedging dampens some price exposure, but balancing and operational inefficiency remain.
- CPA design includes forecast publication/aggregation and balancing implications for intermittent portfolios.
- Forecast standards may tighten over time as the market moves from sandbox/transition toward fuller competition.

Exploit opportunity:
- Position forecasting services as “hedge-compatible optimization”: reduce balancing charges and improve hedge effectiveness.
- Build reporting products that attribute balancing cost to forecast error vs operational constraints.

## 8) Settlement, metering, and credit/collateral readiness are critical enablers
The draft code highlights rigorous metering/reconciliation, balancing settlement timelines, and credit cover/collateral mechanics. Forecasters who ignore settlement plumbing risk delivering model accuracy without financial outcome improvement.

Must-have operational controls:
- Meter data validation and reconciliation workflows.
- Versioned forecast archive tied to nomination and settlement periods.
- Post-event attribution: forecast error, instruction deviation, metering discrepancy, balancing price effects.

Exploit opportunity:
- Offer a combined “Forecast + Settlement Intelligence” service that closes the loop from prediction to financial outcome.
- Use this dataset to continuously recalibrate nomination strategy and confidence intervals.

## 9) Price forecasting should be built now as a decision layer
Price forecasting is worth pursuing now, but it should be tied directly to bid, nomination, and balancing decisions rather than treated as a standalone research stream.

What affects SAWEM prices:
- Net system balance by hour: demand level versus available generation (including wind variability and forecast error).
- Marginal unit economics: the offered incremental prices of the most expensive flexible units required to meet schedule.
- Reserve and flexibility requirements: co-optimization of energy and reserves can move marginal pricing outcomes.
- Network constraints: differences between unconstrained and constrained schedules can materially change dispatch and realized value.
- Gate timing and re-declarations: day-ahead submissions and intra-day re-declarations shift supply-demand balance close to delivery.
- Policy/market design limits: market price cap settings and transition design choices (including CPA and vesting mechanics) shape price behavior.

How SAWEM prices are expected to be set (current draft logic):
- Day-ahead system prices are calculated ex ante per trading period for the following day, based on the unconstrained schedule.
- SMP is formed from the incremental price at the scheduled volume of the marginal flexible trading unit (subject to market design constraints such as the market price cap).
- Intra-day market auctions occur at regular six-hour intervals and produce revised schedules; this progressively updates the system state and expected imbalance exposure.
- Balancing is settled ex post per trading period based on deviations from scheduled positions, with payments/charges between BRPs and the MO.
- Launch reality matters: day-ahead is the mandatory core; some intra-day functionality is expected to mature through phased rollout.

How to use price forecasting to your advantage:
- Build probabilistic price forecasts (P10/P50/P90 or scenario bands), not single-point forecasts, and connect them to nomination decisions.
- Optimize expected imbalance cost, not only energy revenue, by combining output uncertainty and price uncertainty in one objective.
- Create trigger-based rebid logic: revise only when expected value exceeds transaction/operational risk thresholds.
- Improve contract-aware dispatch: decide when to meet obligations through contracted delivery versus market buy/sell based on expected spread outcomes.
- Run daily attribution after settlement: separate P&L impact from forecast volume error, price error, and constraint/instruction effects.
- Productize this as “forecast-to-cash optimization” for BRPs, IPPs, traders, and hybrid portfolios (including BESS-enabled portfolios as they scale).

## Priority action plan for wind forecasters (next 90 days)
1. Stand up BRP-grade day-ahead forecasting operations.
- Hourly forecasts, uncertainty bands, availability overlays, deadline controls.

2. Add intraday nowcasting and rebid decision support.
- Event-triggered updates, intraday value scoring, rebid/no-rebid guidance.

3. Implement imbalance-cost optimization.
- Optimize nominations against expected balancing prices and penalties.

4. Build constraint- and reserve-aware forecast products.
- Include flexibility metrics and constrained-delivery scenarios.

5. Integrate metering and settlement feedback loops.
- Daily variance attribution and model-to-cash performance tracking.

6. Commercialize forecasting as market capability.
- Package services for IPPs, traders, aggregators, and BRPs with clear P&L impact metrics.

7. Launch a decision-grade price forecasting layer.
- Day-ahead and intra-day scenario forecasting linked to nomination, rebid, and imbalance-cost playbooks.

## Final view
For SAWEM, the most important shift is this: wind forecasting is becoming market infrastructure. The highest-performing teams will treat forecasting as a full-stack capability (model + operations + settlement + trading integration), not a standalone weather model. The exploitable edge is the combination of faster updates, better uncertainty handling, contract/constraint awareness, and direct optimization to balancing economics.

## Board Questions: Brief Responses (Revised Market Approach)

### 1) How SAWEM pressure changes priority for IPPs/developers/private off-takers
- SAWEM materially increases operational and financial pressure through BRP obligations, balancing exposure, and settlement discipline.
- For generators above 10 MW, balancing responsibility is expected to apply directly or via designated BRP structures.
- Private off-takers participating directly in market trading must operate under BRP arrangements; off-takers staying outside market participation are generally not BRPs themselves but carry exposure via supplier/contract terms.
- Net effect: forecasting, nomination, and balancing capability becomes a board-level risk-control requirement, not an optional optimization.

### 2) How to approach Round 5 projects (penalizable sites)
- Treat Round 5 as the immediate monetization segment: highest urgency, highest pain from imbalance and compliance failure.
- Offer a “SAWEM Readiness Sprint” package:
  - D-1 forecasting + nomination support
  - imbalance-risk dashboard and tolerance tracking
  - metering/settlement data QA loop
  - operational playbooks for constrained dispatch and intraday updates
- Commercial framing: penalty avoidance + balancing-cost reduction + faster market readiness.

### 3) How to approach facilities in development (Rounds 6 and 7)
- Position as “design-in, not retrofit” segment.
- Bake into project development from day zero:
  - forecast-to-bid workflow architecture
  - telemetry/metering standards for settlement quality
  - BRP/MP operating model and governance
  - portfolio-level reserve/flexibility forecasting interfaces
- Commercial framing: lower future retrofit cost, faster market entry, reduced early-stage imbalance losses.

### 4) How to make it attractive for smaller/older sites with weaker SAWEM exposure
- Use a lighter-value proposition centered on revenue and O&M outcomes (not only penalties/compliance).
- Suggested entry product:
  - low-complexity forecast service
  - alerting for high-value trading windows
  - optional aggregator/third-party BRP integration
  - simple monthly “forecast-to-cash” reporting
- Commercial framing: upside capture with minimal operational burden and low onboarding friction.

### 5) What we should do before/alongside SAWEM School
- SAWEM School should be treated as a strategic accelerator for market code fluency and credibility.
- In parallel (immediately):
  - run internal pilot workflows against likely day-ahead/intraday cycles
  - produce segment-specific offer sheets (Round 5, Round 6/7, legacy-small)
  - define baseline KPIs: nomination accuracy, imbalance cost per MWh, settlement correction rate
- Outcome: by the time SAWEM School is complete, go-to-market execution is already operational.

### Suggested positioning statement to leadership
P-ZERØ should be positioned as a market-readiness and balancing-risk platform for SAWEM, with differentiated offerings by site maturity: immediate risk containment for penalizable assets, design-in readiness for new projects, and low-friction value capture for legacy smaller fleets.
