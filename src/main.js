import AFRAME from 'aframe';
// import 'aframe-meshline-component'
// AFRAME.registerComponent("path-tracker", {
//   init() {
//     this.positions = [];
//     this.line = document.createElement("a-entity");
//     this.el.sceneEl.appendChild(this.line);

//     this.el.sceneEl.addEventListener("enter-vr", () => {
//       this.tick = AFRAME.utils.throttleTick(this.track, 200, this);
//     });
//   },

//   track() {
//     const cam = this.el.sceneEl.camera.el;
//     const pos = cam.object3D.position.clone();

//     if (
//       this.positions.length === 0 ||
//       !pos.equals(this.positions[this.positions.length - 1])
//     ) {
//       this.positions.push(pos.clone());

//       if (this.positions.length >= 2) {
//         const points = this.positions
//           .map((p) => `${p.x} ${p.y} ${p.z}`)
//           .join(", ");

//         this.line.setAttribute("meshline", {
//           lineWidth: 5,
//           path: points,
//           color: "red",
//         });
//       }
//     }
//   },
// });