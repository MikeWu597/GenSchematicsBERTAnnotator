/**
 * @license
 * Simplified version of THREE.OrbitControls
 * Based on OrbitControls.js from Three.js
 */

THREE.OrbitControls = function ( object, domElement ) {

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API
	this.enabled = true;
	this.target = new THREE.Vector3();

	this.enableDamping = false;
	this.dampingFactor = 0.05;

	this.minDistance = 0;
	this.maxDistance = Infinity;

	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	this.minAzimuthAngle = - Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Private variables
	const scope = this;

	const STATE = { NONE: - 1, ROTATE: 0, DOLLY: 1, PAN: 2 };
	let state = STATE.NONE;

	const EPS = 0.000001;

	// Current position in spherical coordinates
	const spherical = new THREE.Spherical();
	const sphericalDelta = new THREE.Spherical();

	let scale = 1;
	const panOffset = new THREE.Vector3();

	const rotateStart = new THREE.Vector2();
	const rotateEnd = new THREE.Vector2();
	const rotateDelta = new THREE.Vector2();

	const panStart = new THREE.Vector2();
	const panEnd = new THREE.Vector2();
	const panDelta = new THREE.Vector2();

	const dollyStart = new THREE.Vector2();
	const dollyEnd = new THREE.Vector2();
	const dollyDelta = new THREE.Vector2();

	// Zoom speed
	this.zoomSpeed = 1.0;

	function getZoomScale() {
		return Math.pow( 0.95, scope.zoomSpeed );
	}

	// Event handlers - FSM: listen for events and reset state
	function onMouseDown( event ) {
		event.preventDefault();

		switch ( event.button ) {
			case 0:
				state = STATE.ROTATE;
				rotateStart.set( event.clientX, event.clientY );
				break;
			case 1:
				state = STATE.DOLLY;
				dollyStart.set( event.clientX, event.clientY );
				break;
			case 2:
				state = STATE.PAN;
				panStart.set( event.clientX, event.clientY );
				break;
		}

		scope.domElement.ownerDocument.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.ownerDocument.addEventListener( 'mouseup', onMouseUp, false );
	}

	function onMouseMove( event ) {
		event.preventDefault();

		switch ( state ) {
			case STATE.ROTATE:
				rotateEnd.set( event.clientX, event.clientY );
				rotateDelta.subVectors( rotateEnd, rotateStart );

				// Rotating across whole screen goes 360 degrees around
				const element = scope.domElement;
				rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth );
				rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

				rotateStart.copy( rotateEnd );
				break;
			case STATE.DOLLY:
				dollyEnd.set( event.clientX, event.clientY );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {
					dollyIn( getZoomScale() );
				} else if ( dollyDelta.y < 0 ) {
					dollyOut( getZoomScale() );
				}

				dollyStart.copy( dollyEnd );
				break;
			case STATE.PAN:
				panEnd.set( event.clientX, event.clientY );
				panDelta.subVectors( panEnd, panStart );

				pan( panDelta.x, panDelta.y );

				panStart.copy( panEnd );
				break;
		}
	}

	function onMouseUp() {
		scope.domElement.ownerDocument.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.ownerDocument.removeEventListener( 'mouseup', onMouseUp, false );

		state = STATE.NONE;
	}

	function onMouseWheel( event ) {
		event.preventDefault();

		if ( event.deltaY < 0 ) {
			dollyOut( getZoomScale() );
		} else if ( event.deltaY > 0 ) {
			dollyIn( getZoomScale() );
		}
	}

	// Core methods for rotation, panning, zooming
	function rotateLeft( angle ) {
		sphericalDelta.theta -= angle;
	}

	function rotateUp( angle ) {
		sphericalDelta.phi -= angle;
	}

	function dollyIn( dollyScale ) {
		scale /= dollyScale;
	}

	function dollyOut( dollyScale ) {
		scale *= dollyScale;
	}

	function pan( deltaX, deltaY ) {
		// Simplified panning
		const offset = new THREE.Vector3();
		const element = scope.domElement;

		offset.copy( scope.object.position ).sub( scope.target );
		let targetDistance = offset.length();

		// Half of the fov is center to top of screen
		targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

		// We actually don't use screenWidth, since perspective camera is fixed to screen height
		panLeft( 2 * deltaX * targetDistance / element.clientHeight );
		panUp( 2 * deltaY * targetDistance / element.clientHeight );
	}

	function panLeft( distance ) {
		const v = new THREE.Vector3();
		v.setFromMatrixColumn( scope.object.matrix, 0 ); // Get X column of object matrix
		v.multiplyScalar( - distance );
		panOffset.add( v );
	}

	function panUp( distance ) {
		const v = new THREE.Vector3();
		v.setFromMatrixColumn( scope.object.matrix, 1 ); // Get Y column of object matrix
		v.multiplyScalar( distance );
		panOffset.add( v );
	}

	// Update method - called on each frame
	this.update = function () {
		const position = scope.object.position;
		const offset = position.clone().sub( scope.target );

		// Convert to spherical coordinates
		spherical.setFromVector3( offset );

		// Apply rotation changes
		spherical.theta += sphericalDelta.theta;
		spherical.phi += sphericalDelta.phi;

		// Restrict phi to be between desired limits
		spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );
		spherical.makeSafe();

		// Apply scale and panning
		spherical.radius *= scale;
		spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

		// Move target based on panning
		scope.target.add( panOffset );

		// Convert back to Cartesian coordinates
		offset.setFromSpherical( spherical );
		position.copy( scope.target ).add( offset );
		scope.object.lookAt( scope.target );

		// Apply damping
		if ( scope.enableDamping ) {
			sphericalDelta.theta *= ( 1 - scope.dampingFactor );
			sphericalDelta.phi *= ( 1 - scope.dampingFactor );
			panOffset.multiplyScalar( 1 - scope.dampingFactor );
		} else {
			sphericalDelta.set( 0, 0, 0 );
			panOffset.set( 0, 0, 0 );
		}

		scale = 1;
	};

	// Event listeners
	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'wheel', onMouseWheel, false );

	// Initialize
	this.update();
};
