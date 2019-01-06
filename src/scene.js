var THREE = require('three');
import * as dat from 'dat.gui';

var camera, scene, renderer;
var plane, gridHelper;
var mouse, raycaster, isShiftDown = false;

var rollOverMesh, rollOverMaterial;
var cubeGeo, cubeMaterial;

var objects =
{
    commons : [],
    devices: []
};

var initDivisions = 20,
    initCubeSize = 50,
    currentCubeSize = initCubeSize,
    currentCubeScale = 1,
    currentType = 'None',
    currentColor = 0xfeb74c,
    groupUUID = guid(),
    INTERSECTED = null
    ;

init();
render();

function init() {
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( 500, 800, 1300 );
    camera.lookAt( 0, 0, 0 );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xf0f0f0 );

    // roll-over helpers
    var rollOverGeo = new THREE.BoxBufferGeometry( initCubeSize, initCubeSize, initCubeSize );
    rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0x0000ff, opacity: 0.5, transparent: true } );
    rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
    scene.add( rollOverMesh );

    // cubes
    cubeGeo = new THREE.BoxBufferGeometry( initCubeSize, initCubeSize, initCubeSize );
    cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c } );

    // grid
    gridHelper = new THREE.GridHelper( 1000, initDivisions );
    scene.add( gridHelper );

    // raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    var geometry = new THREE.PlaneBufferGeometry( 1000, 1000 );
    geometry.rotateX( - Math.PI / 2 );

    plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: false } ) );
    scene.add( plane );

    objects.commons.push(plane);

    // lights
    var ambientLight = new THREE.AmbientLight( 0x606060 );
    scene.add( ambientLight );

    var directionalLight = new THREE.DirectionalLight( 0xffffff );
    directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
    scene.add( directionalLight );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'mousedown', onDocumentMouseDown, false );
    document.addEventListener( 'keydown', onDocumentKeyDown, false );
    document.addEventListener( 'keyup', onDocumentKeyUp, false );

    //
    window.addEventListener( 'resize', onWindowResize, false );

    createPanel();
}

function createPanel() {

    var panel   = new dat.GUI(),
        settings=
        {
            division: initDivisions,
            color: '#feb74c',
            type: currentType,
            "Save Device": function() {
                groupUUID = guid();
            },
            "Clear": function() {
                clearDevicesGroup(groupUUID);
            }
        }
        ;

    var gridFolder = panel.addFolder( 'Grid' ),
        cubeFolder = panel.addFolder( 'Cube' ),
        deviceFolder = panel.addFolder( 'Device' )
        ;

    gridFolder.add( settings, 'division', 10, 50, 10 ).onChange((divisions) =>
    {
        // Update size object
        scene.remove(gridHelper);
        gridHelper = new THREE.GridHelper( 1000, divisions );
        scene.add( gridHelper );

        currentCubeScale = initDivisions/divisions;
        currentCubeSize = currentCubeScale * initCubeSize;
        
        rollOverMesh.scale.set( currentCubeScale, currentCubeScale, currentCubeScale );
    });

    cubeFolder.addColor( settings, 'color').onChange((color) =>
    {
        currentColor = parseInt(color.replace('#', ''), 16);
    });

    deviceFolder.add( settings, 'type', [ 'None', 'Lifx', 'HS100' ]).onChange((type) =>
    {
        // We change the type of the device without saving them. Remove current device group
        clearDevicesGroup(groupUUID);

        currentType = type;
        groupUUID = guid();
    });

    deviceFolder.add( settings, 'Save Device');
    deviceFolder.add( settings, 'Clear');

    gridFolder.open();
    cubeFolder.open();
    deviceFolder.open();
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onDocumentMouseMove( event ) {

    event.preventDefault();

    mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

    raycaster.setFromCamera( mouse, camera );

    var intersects = raycaster.intersectObjects( [].concat(objects.commons).concat(objects.devices) );
    if ( intersects.length > 0 ) {
        var intersect = intersects[ 0 ];
        
        rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
        rollOverMesh.position.divideScalar( currentCubeSize ).floor().multiplyScalar( currentCubeSize ).addScalar( currentCubeSize/2 );
        
        if ( isShiftDown && intersect.object !== plane && INTERSECTED === null) {
            INTERSECTED = intersect.object;
            INTERSECTED.currentColor = intersect.object.material.color.getHex();
            INTERSECTED.material.color.setHex(0xff0000);
        }

        if ( INTERSECTED !== null && INTERSECTED.uuid !== intersect.object.uuid ) {
            INTERSECTED.material.color.setHex(INTERSECTED.currentColor);
            INTERSECTED = null;
        }
        
    }

    render();
}

function onDocumentMouseDown( event ) {

    mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

    raycaster.setFromCamera( mouse, camera );

    var intersects = raycaster.intersectObjects( [].concat(objects.commons).concat(objects.devices) );

    if ( intersects.length > 0 ) {

        var intersect = intersects[ 0 ];

        // delete cube
        if ( isShiftDown ) {

            if ( intersect.object !== plane ) {
                // We allow user to delete a cube instead of the device if he didn't save the device yet.
                if (groupUUID === intersect.object.deviceUUID) {
                    scene.remove( intersect.object );
                    if (intersect.object.deviceType === 'None') {
                        objects.commons.splice( objects.commons.indexOf( intersect.object ), 1 );
                        return;
                    }

                    objects.devices.splice( objects.devices.indexOf( intersect.object ), 1 );
                    return;
                }

                clearDevicesGroup(intersect.object.deviceUUID);
            }

            // create cube
        } else {
            cubeMaterial = new THREE.MeshLambertMaterial( { color:  currentColor } );

            var voxel = new THREE.Mesh( cubeGeo, cubeMaterial );

            voxel.scale.set(currentCubeScale, currentCubeScale, currentCubeScale);
            voxel.position.copy( intersect.point ).add( intersect.face.normal );
            voxel.position.divideScalar( currentCubeSize ).floor().multiplyScalar( currentCubeSize ).addScalar( currentCubeSize/2 );
            voxel.deviceType = currentType;
            voxel.deviceUUID = groupUUID;
            
            scene.add( voxel );

            if (currentType === 'None') {
                objects.commons.push( voxel );
                return;
            }

            objects.devices.push( voxel );
        }

        render();
    }
}

function onDocumentKeyDown( event ) {

    switch ( event.keyCode ) {
        case 16:
            isShiftDown = true;
            rollOverMesh.visible = false;
            render();
            break;
    }
}

function onDocumentKeyUp( event ) {

    switch ( event.keyCode ) {
        case 16:
            isShiftDown = false;
            rollOverMesh.visible = true;
            render();
            break;
    }
}

function render() {
    renderer.render( scene, camera );
}

function clearDevicesGroup(uuid) {
    var i = 0,
        j = objects.devices.length
        ;

    for (i; i < j; i++) {
        var device = objects.devices[i];

        if (typeof device.deviceUUID !== 'undefined'
            && device.deviceUUID === uuid
        ) {
            scene.remove( device );
            objects.devices.splice( i--, 1 );
        }
    }
    
    
    var m = 0,
        n = objects.commons.length
        ;

    for (m; m < n; m++) {
        var common = objects.commons[m];

        if (typeof common.deviceUUID !== 'undefined'
            && common.deviceUUID === uuid
        ) {
            scene.remove( common );
            objects.commons.splice( m--, 1 );
        }
    }
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}