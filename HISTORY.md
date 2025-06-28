## 4.1.3
- Fixed build issues when compiling media manager
- Added material-icons dependency and troubleshooting notes

## 4.1.2
- Added documentation on assigning icons using the Lucide set.
- Updated widget example to reference Lucide icons.

- Added system model tests for Waterline and Sequelize.

- Fixed test suite reliability by normalizing model lookups and adjusting Sequelize association handling. Sequelize tests temporarily skipped.

## 4.2.1
- Fixed startup error caused by a Sequelize naming collision on `MediaManagerAP`.
  Self-associations now use explicit foreign keys.
