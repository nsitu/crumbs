import AFRAME from 'aframe';

// Simple breadcrumb trail component
AFRAME.registerComponent('breadcrumb-trail', {
  schema: {
    interval: { type: 'number', default: 200 }, // milliseconds between breadcrumbs (more frequent for mobile)
    minDistance: { type: 'number', default: 0.1 }, // smaller distance for mobile movement
    breadcrumbSize: { type: 'number', default: 0.05 },
    trailColor: { type: 'color', default: '#ff6b6b' }
  },

  init: function () {
    this.breadcrumbs = [];
    this.lastPosition = new THREE.Vector3();
    this.lastTime = 0;

    // Get the camera rig (for VR) or camera (for desktop)
    this.cameraRig = this.el.sceneEl.querySelector('#cameraRig') || this.el.sceneEl.querySelector('[camera]');
    this.camera = this.el.sceneEl.camera;

    console.log('Breadcrumb trail initialized for mobile/VR movement');
  },

  tick: function (time) {
    // Only drop breadcrumbs at specified intervals
    if (time - this.lastTime < this.data.interval) {
      return;
    }

    if (!this.camera) {
      this.camera = this.el.sceneEl.camera;
      return;
    }

    // Get current position - either from camera rig (VR) or camera (desktop)
    const currentPosition = new THREE.Vector3();

    // For VR/mobile, we want to track the rig position which includes room-scale movement
    if (this.cameraRig && this.cameraRig !== this.camera.el) {
      this.cameraRig.object3D.getWorldPosition(currentPosition);
    } else {
      this.camera.getWorldPosition(currentPosition);
    }

    // Check if we've moved far enough to drop a new breadcrumb
    const distance = currentPosition.distanceTo(this.lastPosition);

    if (distance >= this.data.minDistance) {
      this.dropBreadcrumb(currentPosition);
      this.lastPosition.copy(currentPosition);
      this.lastTime = time;
    }
  },

  dropBreadcrumb: function (position) {
    // Create a small sphere as a breadcrumb
    const breadcrumb = document.createElement('a-sphere');
    breadcrumb.setAttribute('radius', this.data.breadcrumbSize);
    breadcrumb.setAttribute('color', this.data.trailColor);
    breadcrumb.setAttribute('position', `${position.x} ${position.y} ${position.z}`);

    // Add some glow effect
    breadcrumb.setAttribute('material', {
      color: this.data.trailColor,
      emissive: this.data.trailColor,
      emissiveIntensity: 0.3
    });

    this.el.sceneEl.appendChild(breadcrumb);
    this.breadcrumbs.push(breadcrumb);

    // Connect to previous breadcrumb with a line
    if (this.breadcrumbs.length > 1) {
      const previousBreadcrumb = this.breadcrumbs[this.breadcrumbs.length - 2];
      const previousPos = previousBreadcrumb.getAttribute('position');

      const line = document.createElement('a-entity');
      line.setAttribute('line', {
        start: `${previousPos.x} ${previousPos.y} ${previousPos.z}`,
        end: `${position.x} ${position.y} ${position.z}`,
        color: this.data.trailColor,
        opacity: 0.7
      });

      this.el.sceneEl.appendChild(line);
    }

    console.log(`Dropped breadcrumb at ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
  }
});

// Initialize the scene
document.addEventListener('DOMContentLoaded', function () {
  console.log('A-Frame loaded, setting up breadcrumb trail');

  // Wait for the scene to be ready
  const scene = document.querySelector('a-scene');
  if (scene) {
    scene.addEventListener('loaded', function () {
      console.log('Scene loaded, adding breadcrumb trail component');
      scene.setAttribute('breadcrumb-trail', '');
    });
  }
}); 