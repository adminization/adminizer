
## 4.2.1
- Renamed MediaManager parent association to `parent` to resolve Sequelize naming collision.
## 4.1.4
- Fixed Sequelize system model registration errors in tests.
## 4.1.3
- Fixed build issues when compiling media manager
- Added material-icons dependency and troubleshooting notes

## 4.1.2
- Added documentation on assigning icons using the Lucide set.
- Updated widget example to reference Lucide icons.

- Added system model tests for Waterline and Sequelize.


## 4.2.1
- Fixed failing tests by adding case-insensitive model lookup and resolving Sequelize association naming conflicts.

## 4.2.2
- Explicit foreign key names now avoid collisions between attributes and associations in Sequelize.
- Introduced dedicated view pages and viewPath support for controls
