import * as faceapi from "face-api.js";

export class WebglFaceDetector {
  constructor() {
    this._canvas = null;
    this._gl = null;
    this._program = null;
    this._width = -1;
    this._height = -1;
    this._mask = null;
    this._helper = null;
  }

  async init() {
    const MODEL_URL = "/models";
    await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
    // await faceapi.loadFaceLandmarkModel(MODEL_URL);
    // await faceapi.loadFaceRecognitionModel(MODEL_URL);
  }

  processVideoFrame(videoFrame, mask) {
    const size = videoFrame.height * videoFrame.width;

    let planeY = {
      data: videoFrame.data.subarray(0, size),
      width: videoFrame.width,
      height: videoFrame.height,
    };

    // let planeUV = {
    //   data: videoFrame.data.subarray(size, (size * 3) / 2),
    //   width: videoFrame.width,
    //   height: videoFrame.height / 2,
    // };

    if (mask && mask != this._mask?.src) {
      this._mask = new Image();
      this._mask.src = mask;
    } else {
      this._mask = null;
    }

    let plane = planeY;
    this._prepare(plane.width, plane.height);
    this._op_scale_gl(this._gl, plane.data, 1, plane.data);
  }

  _op_scale_gl(gl, srcBytes, scale, dstBytes) {
    let program = this._program;
    gl.useProgram(program);
    const positionLoc = gl.getAttribLocation(program, "position");
    const srcTexLoc = gl.getUniformLocation(program, "srcTex");
    const srcDimensionsLoc = gl.getUniformLocation(program, "srcDimensions");
    const u_scale = gl.getUniformLocation(program, "u_scale");

    // setup a full canvas clip space quad
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    // setup our attributes to tell WebGL how to pull
    // the data from the buffer above to the position attribute
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // create our source texture
    const srcWidth = this._width;
    const srcHeight = this._height;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // see https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      srcWidth,
      srcHeight,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      new Uint8Array(srcBytes)
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.uniform1i(srcTexLoc, 0); // tell the shader the src texture is on texture unit 0
    gl.uniform2f(srcDimensionsLoc, srcWidth, srcHeight);
    gl.uniform1f(u_scale, scale);

    gl.drawArrays(gl.TRIANGLES, 0, 6); // draw 2 triangles (6 vertices)

    // get the result
    const dstWidth = this._width;
    const dstHeight = this._height;
    const results = new Uint8Array(dstWidth * dstHeight * 4);
    gl.readPixels(
      0,
      0,
      dstWidth,
      dstHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      results
    );

    this._detect(results, srcWidth, srcHeight);
    this._helper.draw();

    gl.readPixels(
      0,
      0,
      dstWidth,
      dstHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      results
    );

    for (let i = 0; i < dstWidth * dstHeight; ++i) {
      dstBytes[i] = results[i * 4];
    }
  }

  _detect(results, width, height) {
    const debug = document.getElementById("debug");
    const ctx = debug.getContext("2d");
    const image = ctx.createImageData(width, height);
    image.data.set(results);
    ctx.putImageData(image, 0, 0);

    faceapi.detectSingleFace(debug).then((res) => {
      if (res) {
        const { x, y, width, height } = res.box;
        this._helper.ctx.clearRect(
          0,
          0,
          this._helper.canvas.width,
          this._helper.canvas.height
        );
        if (this._mask) {
          this._helper.ctx.drawImage(this._mask, x, y, width, height);
        } else {
          this._helper.ctx.strokeRect(x, y, width, height);
        }
        this._helper.update_canvasTexture();
      }
    });
  }

  _prepare(w, h) {
    if (this._width == w && this._height == h) {
      return 0;
    }

    this._canvas = document.createElement("canvas");
    this._canvas.width = w;
    this._canvas.height = h;
    this._gl = this._canvas.getContext("webgl2");
    this._width = w;
    this._height = h;

    const vs = `
            attribute vec4 position;
            varying vec2 v_coordinate;
            void main() {
              gl_Position = position;
              v_coordinate = gl_Position.xy * 0.5 + 0.5;
            }
        `;

    const fs = `
            precision lowp float;

            uniform sampler2D srcTex;
            uniform vec2 srcDimensions;
            uniform float u_scale;

            // the varible defined in the vertex shader above
            varying vec2 v_coordinate;
            uniform sampler2D u_texture;

            void main() {
              vec2 texcoord = gl_FragCoord.xy / srcDimensions;
              vec4 value = texture2D(srcTex, texcoord);
              gl_FragColor = value;
            }
        `;

    let gl = this._gl;
    let program = this._createProgramFromSources(gl, vs, fs);
    gl.useProgram(program);
    this._program = program;

    this._helper = Canvas2DHelper(this._gl, this._canvas);
    this._helper.ctx.lineWidth = 2;
    this._helper.ctx.strokeStyle = "yellow";
  }

  _createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }

  _createProgramFromSources(gl, vs_src, fs_src) {
    var vertexShader = this._createShader(gl, gl.VERTEX_SHADER, vs_src);
    var fragmentShader = this._createShader(gl, gl.FRAGMENT_SHADER, fs_src);
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
}
