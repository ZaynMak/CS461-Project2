/**
 * ClothAnimation constructor
 * @param  {String} canvasID: ID of the canvas to render to
 * @param  {Number} nx:       Number of points in x-direction
 * @param  {Number} ny:       Number of points in y-direction
 * @param  {bool}   physics_based:
 *                            Whether to perform physics-based
 *                            animation (part 3) or use a formula (part 2).
 */
function ClothAnimation( canvasID , nx, ny, physics_based ) {

  // save whether or not this is physics based
  this.physics_based = physics_based;

  // save the incoming parameters
  this.nx = nx; // number of points in x-direction
  this.ny = ny; // number of points in y-direction

  // save the canvas
  this.canvas = document.getElementById(canvasID);
	this.gl = this.canvas.getContext('webgl');
  
	// initialize the time (only used in part 2)
  this.time = 0.0;

  // PART 1:
  // setup the mesh (points, triangles, edges, parameter coordinates)
	
	// save the increment (distance between points)
	const dx = 1.0/nx; //they gave me errors when I only had the if statements
	const dy = 1.0/ny;
	if (nx != 1){
		const dx = 1.0/(nx -1); // we are doing -1 because we have n-1 horizontal edges in one row
	}
	if (ny != 1){
		const dy = 1.0/(ny -1);// we are doing -1 because we have n-1 vertical edges in one column
	}

	// initialize the arrays for vertices and parameters
	this.vertx = [];
	this.param = []

	// sets up vertices and parameters
	for (let j = 0; j < ny; j++){
		for (let i = 0; i < nx; i++){
			// values for parameter
			let u = i*dx;
      let v = j*dy;

			// values for vertex
			let x = -0.5 + u;
			let y = -0.25 + v;

			this.vertx.push(x,y);
			this.param.push(u,v); 
		}
	}

	this.triangles = [];
	for (let j = 0; j < ny - 1; j++) {
		for (let i = 0; i < nx - 1; i++) {

			// determine the four vertices defining the rectangle
			let i0 = j*nx + i;
			let i1 = i0 + 1;
			let i2 = i0 + nx;
			let i3 = i2 + 1;

			this.triangles.push(i0,i1,i3); // first triangle indices
			this.triangles.push(i0,i3,i2); // second triangle indices
		}
  }

	this.edges = []
	// sets up vertices and parameters
	for (let j = 0; j < ny; j++){
		for (let i = 0; i < nx; i++){
			// if we are not in the last column save the horizontals
			if (i != nx - 1){
				let p1 = j*nx + i;
				let p2 = p1 + 1;
				this.edges.push(p1,p2);
			}
			// if we are not in the last row save the vertical edges
			if (j != ny - 1){
				let p1 = j*nx + i;
				let p2 = p1 + nx;
				this.edges.push(p1,p2);
			} 
		}
	}
  
	this.points = [];
	let mass = 0.05;

	for (let k = 0; k < this.vertx.length; k+=2){
			let p = vec2.fromValues(this.vertx[k], this.vertx[k+1]);
			this.points.push(new Point(p, mass));
	}

	this.constraints = [];
	for (let k = 0; k < this.edges.length; k+=2){
		let p = this.points[this.edges[k]];
    let q = this.points[this.edges[k+1]];
    this.constraints.push( new Constraint(p,q) );
	}

	let fixed = [0, Math.floor(nx* (ny-1)/2), ny * (nx-1)];
	for (let i = 0; i < fixed.length; i++){
		this.points[fixed[i]].inverse_mass = 0.0;
	}
	
	// PART 2
  // setup some webgl stuff here
	let vertex_shader_source = `
  attribute vec2 a_Position;
	attribute vec2 a_Parameter;

	varying vec2 v_Parameter;

  void main(void) {
		v_Parameter = a_Parameter;

	  gl_Position = vec4(a_Position, 0.0, 1.0 );

  }`;

  // define the fragment shader source
  let fragment_shader_source = `
  precision highp float;
	uniform sampler2D image_color;

	uniform int u_edges;

	varying vec2 v_Parameter;

  void main(void) {

		if (u_edges < 0)
	    gl_FragColor = texture2D(image_color, v_Parameter);
    else
      gl_FragColor = vec4(0.0,0.0,0.0,1.0);
  }`;
	// create a buffer for the coordinates and write the vertex coordinates to it
	let gl = this.gl;

	this.program = compileProgram(gl, vertex_shader_source, fragment_shader_source);

	// create a buffer for the vertex parameter coordinates
  this.parameterBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ARRAY_BUFFER , this.parameterBuffer );
  gl.bufferData( gl.ARRAY_BUFFER , new Float32Array(this.param) , gl.STATIC_DRAW );

  // enable the parameter coordinates attribute
	// gl.uniform1i(gl.getUniformLocation(this.program, 'u_edges'), -1 );
  let aParameter = gl.getAttribLocation(this.program,'a_Parameter');
  gl.vertexAttribPointer( aParameter , 2, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray(aParameter);

  // setup the textures
  setupImageTexture(gl,this.program,'flower','image_color',0);
}

/**
 * updates the cloth points and redraws
 */
ClothAnimation.prototype.update = function() {

  // update the time: you can change the increment if you want
  // (this is only used in part 2)
  this.time += 0.1; 

  // update the point coordinates here
  if (!this.physics_based) {
    // in part 2, you can use the explicit function given in the project description
 
		for (let k = 0; k < this.vertx.length; k+=2){
			this.vertx[k] += 0.04 * Math.cos(this.time)* Math.sin(0.75 - this.vertx[k+1]);
		}
  }
  else {
    // in part 3, you should use the physics-based code from lab 9
		let nb_iter = 2;
		for (let iter = 0; iter < nb_iter; iter++) {
			
			for (let i = 0; i < this.points.length; i++){
				this.points[i].move();
			}

			for (let i = 0; i < this.constraints.length; i++){
				this.constraints[i].satisfy();
			}

			for (let i = 0; i < this.points.length; i++){
				this.vertx[2*i] = this.points[i].current[0];
				this.vertx[2*i + 1] = this.points[i].current[1];
			}
		}
  }

  // redraw the cloth
  this.draw();
}

/**
 * draws the cloth with the current point locations using WebGL
 */
ClothAnimation.prototype.draw = function() {

  // PART 2 (continued)
	 let gl = this.gl;
  // setup some webgl stuff here
	// clear screen
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
	// create a buffer for the vertices and // enable the position attribute
	this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ARRAY_BUFFER , this.vertexBuffer );
  gl.bufferData( gl.ARRAY_BUFFER , new Float32Array(this.vertx) , gl.STATIC_DRAW );
	this.positionAttribute = gl.getAttribLocation( this.program , 'a_Position' );
  gl.vertexAttribPointer(this.positionAttribute, 2 , gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(this.positionAttribute);


	// retrieve the location of the uniform that controls whether we are drawing edges
  let u_edges = gl.getUniformLocation( this.program , 'u_edges');


  // create a buffer for the triangles and write the triangle indices to it
  this.triangleBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , this.triangleBuffer );
  gl.bufferData( gl.ELEMENT_ARRAY_BUFFER , new Uint16Array(this.triangles) , gl.STATIC_DRAW );

  // draw the triangles
	gl.uniform1i( u_edges , -1 );
  gl.drawElements( gl.TRIANGLES , this.triangles.length , gl.UNSIGNED_SHORT , 0 );


	// create a buffer for the edges and write the edge indices to it
	this.edgeBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER , this.edgeBuffer );
	gl.bufferData( gl.ELEMENT_ARRAY_BUFFER , new Uint16Array(this.edges) , gl.STATIC_DRAW );

  // draw the edges
	gl.uniform1i( u_edges , 1 );
	gl.drawElements( gl.LINES , this.edges.length , gl.UNSIGNED_SHORT , 0 );
}

// -----------------------------------------------------------------\\
// the rest of this file contains some WebGL utilities              \\
// for compiling a shader program, and setting up a texture         \\
// -----------------------------------------------------------------\\
/**
 * compiles a shader
 * @param  {WebGLRenderingContext}
 * @param  {String} Shader source
 * @param  {Number} type of shader to compile (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @return {WebGLShader}
 */
function compileShader(gl, shaderSource, type) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw "Unable to compile " + (type === gl.VERTEX_SHADER ? 'vertex': 'fragment') + " shader: " + error;
  }

  return shader;
}

/**
 * compiles a shader program
 * @param  {WebGLRenderingContext} gl
 * @param  {String} vertexShaderSource
 * @param  {String} fragmentShaderSource
 * @return {WebGLProgram}
 */
function compileProgram( gl , vertexShaderSource , fragmentShaderSource ) {

  let vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  let fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw "Unable to compile the shader program: " + gl.getProgramInfoLog(program);
  }

  gl.useProgram(program);
  return program;
}

/**
 * sets up a texture from an image in the HTML document
 * @param  {WebGLRenderingContext} gl
 * @param  {WebGLProgram} program
 * @param  {String} imageID: DOM element ID of the image (see index.html)
 * @param  {String} uniformName: name of the texture sampler in the shader
 * @param  {Number} index: index of the texture (offset from gl.TEXTURE0)
 * @param  {bool} flip: flips image data along its vertical axis if true.
 */
function setupImageTexture( gl , program , imageID , uniformName , index , flip ) {

  // retrieve the image
  let image = document.getElementById(imageID);

  // create the texture and activate it
  let texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + index );
  gl.bindTexture( gl.TEXTURE_2D, texture );

  // define the texture to be that of the requested image
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
  gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image );

  // generate the mipmap and filters
  gl.generateMipmap( gl.TEXTURE_2D );
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

  // tell webgl which texture index to use for the uniform sampler2D in the shader
  // you will need a 'uniform sampler2D uniformName' to use the texture within your shader
  gl.uniform1i( gl.getUniformLocation(program, uniformName) , index );
}
