# Microtome

Microtome is a gpu accelerated model slicer intended for generating slice images for
use in DLP style 3D printers. Eventually it will be expanded to control 3D printers
using Chrome App serial port support

# Status

I am currently in the process of porting Microtome from Dart to Typescript. This is being done due to various
issues with the Dart platform and Chrome Apps; specifically in the mistaken belief to make it more "secure", inter
window communication even inside a self-contained chrome app is severely crippled.

- [ ] For z axis change pitch to lead as its what really matters
- [ ] Slice to zip file via zipjs and filejs, create a download containing PNG slices
- [ ] Enable scrollwheel in slice preview
- [ ] Add Job configuration object
  - [ ] Specify slice thickness as multiples of minimum printer slice
  - [ ] Job name
  - [ ] Job desc
  - [ ] Layer exposure times
  - [ ] Layer blank / move times
  - [ ] Job length estimate
  - [ ] Specify raft thickness
  - [ ] Specify initial z-offset offset for all loaded meshes
  - [ ] Export/Import job spec
- [ ] Slice shader improvements
  - [ ] Specify thickness of support grind in mm
  - [ ] Specify support cube lattice spacing in mm
  - [ ] Allow rotation of support cube matrix
  - [ ] Generate raft
  - [ ] Support multi-step layer exposure patterns to reduce heat generation for large slice areas.
- [ ] Print volume preview
  - [ ] Move
  - [ ] Rotate
  - [ ] Scale
  - [ ] Select
  - [ ] Add
  - [ ] Delete
  - [ ] Copy
- [ ] Export / Import project
  - [ ] Job settings
  - [ ] Printer config
  - [ ] Current project layout
