const Canvas2DHelper = function (gl, canvasElement) {
  // some globalz:
  let CV = null,
    CANVAS2D = null,
    CTX = null,
    GL = null,
    CANVASTEXTURE = null,
    CANVASTEXTURENEEDSUPDATE = null,
    SHADERCOPY = null,
    VIDEOTEXTURE = null;
  let VIDEOTEXTURETRANSFORMMAT2 = null,
    UUVTRANSFORM = null;

  GL = gl;
  CV = canvasElement;

  const COORDINATES = {
    x: 0,
    y: 0,
    s: 0,
  };

  //BEGIN WEBGL HELPERS
  // compile a shader:
  function compile_shader(source, glType, typeString) {
    const glShader = GL.createShader(glType);
    GL.shaderSource(glShader, source);
    GL.compileShader(glShader);
    if (!GL.getShaderParameter(glShader, GL.COMPILE_STATUS)) {
      alert(
        "ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(glShader)
      );
      return null;
    }
    return glShader;
  }

  // helper function to build the shader program:
  function build_shaderProgram(shaderVertexSource, shaderFragmentSource, id) {
    // compile both shader separately:
    const glShaderVertex = compile_shader(
      shaderVertexSource,
      GL.VERTEX_SHADER,
      "VERTEX " + id
    );
    const glShaderFragment = compile_shader(
      shaderFragmentSource,
      GL.FRAGMENT_SHADER,
      "FRAGMENT " + id
    );

    const glShaderProgram = GL.createProgram();
    GL.attachShader(glShaderProgram, glShaderVertex);
    GL.attachShader(glShaderProgram, glShaderFragment);

    // start the linking stage:
    GL.linkProgram(glShaderProgram);
    return glShaderProgram;
  }
  //END WEBGL HELPERS

  // create and size the 2D canvas and its drawing context:
  CANVAS2D = document.createElement("canvas");
  // CANVAS2D = document.getElementById("canvas");
  CANVAS2D.width = CV.width;
  CANVAS2D.height = CV.height;
  CTX = CANVAS2D.getContext("2d");

  // create the WebGL texture with the canvas:
  CANVASTEXTURE = GL.createTexture();
  GL.bindTexture(GL.TEXTURE_2D, CANVASTEXTURE);
  GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, CANVAS2D);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);

  // build the copy shader program:
  const copyVertexShaderSource =
    "attribute vec2 position;\n\
      uniform mat2 UVTransformMat2;\n\
      varying vec2 vUV;\n\
      void main(void){\n\
        gl_Position = vec4(position, 0., 1.);\n\
        vUV = vec2(0.5,0.5) + UVTransformMat2 * position;\n\
      }";

  const copyFragmentShaderSource =
    "precision lowp float;\n\
      uniform sampler2D samplerImage;\n\
      varying vec2 vUV;\n\
      \n\
      void main(void){\n\
        gl_FragColor = texture2D(samplerImage, vUV);\n\
      }";
  SHADERCOPY = build_shaderProgram(
    copyVertexShaderSource,
    copyFragmentShaderSource,
    "VIDEO"
  );
  const uSampler = GL.getUniformLocation(SHADERCOPY, "samplerImage");
  UUVTRANSFORM = GL.getUniformLocation(SHADERCOPY, "UVTransformMat2");
  GL.useProgram(SHADERCOPY);
  GL.uniform1i(uSampler, 0);

  return {
    canvas: CANVAS2D,
    ctx: CTX,

    update_canvasTexture: function () {
      CANVASTEXTURENEEDSUPDATE = true;
    },

    draw: function () {
      // draw the video and the canvas above
      GL.viewport(0, 0, CV.width, CV.height);
      GL.useProgram(SHADERCOPY);

      const buffer = GL.createBuffer();
      GL.bindBuffer(gl.ARRAY_BUFFER, buffer);
      GL.bufferData(
        GL.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        GL.STATIC_DRAW
      );

      // enable blending:
      GL.enable(GL.BLEND);
      GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);

      // draw the video first:
      //GL.bindTexture(GL.TEXTURE_2D, VIDEOTEXTURE);
      //GL.uniformMatrix2fv(UUVTRANSFORM, false, VIDEOTEXTURETRANSFORMMAT2);
      //GL.drawElements(GL.TRIANGLES, 3, GL.UNSIGNED_SHORT, 0);

      // then draw the canvas:
      GL.bindTexture(GL.TEXTURE_2D, CANVASTEXTURE);
      GL.uniformMatrix2fv(UUVTRANSFORM, false, [0.5, 0, 0, 0.5]);
      if (CANVASTEXTURENEEDSUPDATE) {
        GL.texImage2D(
          GL.TEXTURE_2D,
          0,
          GL.RGBA,
          GL.RGBA,
          GL.UNSIGNED_BYTE,
          CANVAS2D
        );
      }
      // GL.drawElements(GL.TRIANGLES, 3, GL.UNSIGNED_SHORT, 0);
      GL.drawArrays(gl.TRIANGLES, 0, 6);

      GL.disable(GL.BLEND);
    },

    getCoordinates: function (detectedState) {
      COORDINATES.x = Math.round(
        (0.5 + 0.5 * detectedState.x - 0.5 * detectedState.s) * CV.width
      );
      COORDINATES.y = Math.round(
        (0.5 + 0.5 * detectedState.y - 0.5 * detectedState.s) * CV.height
      );
      COORDINATES.w = Math.round(detectedState.s * CV.width);
      COORDINATES.h = COORDINATES.w;
      return COORDINATES;
    },

    resize: function () {
      CANVAS2D.width = CV.width;
      CANVAS2D.height = CV.height;
    },
  }; //end Canvas2DDisplay return value
}; //end JeelizCanvas2DHelper()
