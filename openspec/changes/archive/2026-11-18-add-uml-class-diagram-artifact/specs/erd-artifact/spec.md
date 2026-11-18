# Spec Delta

## REMOVED Requirements

### Requirement: Groups
**Reason**: The shared group rule changes (user's decision, 2026-11-18): a drawing may have up to sixteen groups, and the five group colors cycle from the sixth, instead of rejecting a sixth group.
**Migration**: Replaced by "Groups with cycling colors". Every model valid before stays valid; models with six to sixteen groups become valid.

## ADDED Requirements

### Requirement: Groups with cycling colors
A model MAY define up to sixteen groups and assign each entity to at most one. A model with more than sixteen groups SHALL be rejected. Groups take the five group roles in order of first appearance and cycle from the sixth. Each group with at least one entity SHALL be drawn as a zone, in its group role and labelled, that contains exactly its entities.

#### Scenario: Six groups reuse the first color
- **WHEN** a model defines six groups
- **THEN** the model is valid, the sixth group takes the first group role, and every zone carries its own label

#### Scenario: Seventeen groups rejected
- **WHEN** a model defines seventeen groups
- **THEN** validation fails and suggests merging groups or splitting the diagram

#### Scenario: Groups drawn as zones
- **WHEN** a model puts five tables in "Sales", four in "Catalog" and two in "Billing", and leaves one ungrouped
- **THEN** three zones are drawn, each labelled and tinted with its group role, each containing only its tables, and the ungrouped table sits outside every zone
