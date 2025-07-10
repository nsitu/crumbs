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

// WebXR Room Tracking Component with Motion Estimation
AFRAME.registerComponent('webxr-camera-rig', {
  init: function () {
    this.velocity = { x: 0, y: 0, z: 0 };
    this.position = { x: 0, y: 0, z: 0 };
    this.lastTime = Date.now();
    this.isTracking = false;
    
    console.log('Motion tracking component initialized');
  },

  startMotionTracking: function () {
    if (this.isTracking) return;
    
    console.log('Starting motion tracking...');
    this.isTracking = true;
    
    // Listen for device motion events
    window.addEventListener('devicemotion', this.onDeviceMotion.bind(this));
    
    // Update position every frame
    this.el.sceneEl.addEventListener('tick', this.updatePosition.bind(this));
  },

  onDeviceMotion: function (event) {
    if (!event.acceleration) return;
    
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;
    
    // Filter out small accelerations (noise/gravity)
    const threshold = 1.0;
    const acc = event.acceleration;
    
    if (Math.abs(acc.x) > threshold || Math.abs(acc.z) > threshold) {
      // Integrate acceleration to get velocity (very basic)
      const sensitivity = 0.1;
      this.velocity.x += (acc.x || 0) * deltaTime * sensitivity;
      this.velocity.z += (acc.z || 0) * deltaTime * sensitivity;
      
      // Apply damping to prevent drift
      this.velocity.x *= 0.95;
      this.velocity.z *= 0.95;
      
      console.log(`Motion detected: acc(${acc.x?.toFixed(2)}, ${acc.z?.toFixed(2)}) vel(${this.velocity.x.toFixed(2)}, ${this.velocity.z.toFixed(2)})`);
      
      // Update debug display
      const debugDiv = document.getElementById('debug-info');
      if (debugDiv) {
        debugDiv.innerHTML = `Acc: X=${acc.x?.toFixed(1)} Z=${acc.z?.toFixed(1)}<br>Vel: X=${this.velocity.x.toFixed(2)} Z=${this.velocity.z.toFixed(2)}<br>Pos: X=${this.position.x.toFixed(2)} Z=${this.position.z.toFixed(2)}`;
      }
    }
  },

  updatePosition: function () {
    if (!this.isTracking) return;
    
    // Integrate velocity to get position
    this.position.x += this.velocity.x;
    this.position.z += this.velocity.z;
    
    // Update the camera rig position
    const currentPos = this.el.getAttribute('position');
    this.el.setAttribute('position', {
      x: this.position.x,
      y: currentPos.y, // Keep Y position stable
      z: this.position.z
    });
  },

  // Add a manual reset function
  resetPosition: function () {
    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.el.setAttribute('position', '0 0 0');
    console.log('Position reset');
  }
});

// Touch movement component for mobile
AFRAME.registerComponent('touch-movement', {
  init: function () {
    this.isDragging = false;
    this.lastTouch = { x: 0, y: 0 };
    
    // Bind touch events
    this.el.sceneEl.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.el.sceneEl.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.el.sceneEl.addEventListener('touchend', this.onTouchEnd.bind(this));
  },

  onTouchStart: function (event) {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.lastTouch.x = event.touches[0].clientX;
      this.lastTouch.y = event.touches[0].clientY;
    }
  },

  onTouchMove: function (event) {
    if (!this.isDragging || event.touches.length !== 1) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    const deltaX = touch.clientX - this.lastTouch.x;
    const deltaY = touch.clientY - this.lastTouch.y;
    
    // Move the camera rig based on touch movement
    const cameraRig = this.el;
    const currentPosition = cameraRig.getAttribute('position');
    
    // Convert screen movement to world movement
    const moveSpeed = 0.01;
    cameraRig.setAttribute('position', {
      x: currentPosition.x + deltaX * moveSpeed,
      y: currentPosition.y,
      z: currentPosition.z + deltaY * moveSpeed
    });
    
    this.lastTouch.x = touch.clientX;
    this.lastTouch.y = touch.clientY;
  },

  onTouchEnd: function () {
    this.isDragging = false;
  }
});

// Initialize the scene
document.addEventListener('DOMContentLoaded', function () {
  console.log('A-Frame loaded, setting up breadcrumb trail');

  // Set up room tracking button
  const enableButton = document.getElementById('enable-tracking');
  const resetButton = document.getElementById('reset-position');
  const statusDiv = document.getElementById('tracking-status');
  const debugDiv = document.getElementById('debug-info');
  
  if (enableButton) {
    enableButton.addEventListener('click', function() {
      requestRoomTracking();
    });
  }
  
  if (resetButton) {
    resetButton.addEventListener('click', function() {
      const cameraRig = document.querySelector('#cameraRig');
      if (cameraRig && cameraRig.components['webxr-camera-rig']) {
        cameraRig.components['webxr-camera-rig'].resetPosition();
        statusDiv.textContent = 'Position reset! Walk around to see new trail.';
      }
    });
  }

  function requestRoomTracking() {
    statusDiv.style.display = 'block';
    statusDiv.textContent = 'Requesting permissions...';
    
    const cameraRig = document.querySelector('#cameraRig');
    
    // Request device motion permission for iOS
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then((response) => {
        if (response === 'granted') {
          statusDiv.textContent = 'Motion tracking enabled! Walk around to see trail.';
          enableButton.style.display = 'none';
          resetButton.style.display = 'inline-block';
          debugDiv.style.display = 'block';
          if (cameraRig && cameraRig.components['webxr-camera-rig']) {
            cameraRig.components['webxr-camera-rig'].startMotionTracking();
          }
        } else {
          statusDiv.textContent = 'Permission denied. Try touch controls instead.';
        }
      });
    } else {
      // For Android, start motion tracking directly
      statusDiv.textContent = 'Motion tracking enabled! Walk around to see trail.';
      enableButton.style.display = 'none';
      resetButton.style.display = 'inline-block';
      debugDiv.style.display = 'block';
      if (cameraRig && cameraRig.components['webxr-camera-rig']) {
        cameraRig.components['webxr-camera-rig'].startMotionTracking();
      }
    }
  }

  // Wait for the scene to be ready
  const scene = document.querySelector('a-scene');
  if (scene) {
    scene.addEventListener('loaded', function () {
      console.log('Scene loaded, adding breadcrumb trail component');
      scene.setAttribute('breadcrumb-trail', '');
      
      // Add touch movement to camera rig as fallback
      const cameraRig = document.querySelector('#cameraRig');
      if (cameraRig) {
        cameraRig.setAttribute('touch-movement', '');
        console.log('Touch movement added to camera rig as fallback');
      }
    });
  }
}); 