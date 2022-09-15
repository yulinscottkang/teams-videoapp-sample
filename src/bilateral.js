//https://github.com/m0ose/imageRoutines/blob/master/js/bilateralFilter.js




export function getIntensities(data, width, height) {
    var result = new Float32Array(width * height)
    for (var i = 0; i < result.length; i++) {
        var indx = i * 3
        // 0.2126 * R + 0.7152 * G + 0.0722 * B
        result[i] =
            0.2126 * data[indx] +
            0.7152 * data[indx + 1] +
            0.0722 * data[indx + 2]
    }
    return result
}


export class gaussianKernel{
    constructor( sigma=1, w=13, h )
    {
      this.w = w
      this.h = h || w
      console.log('making kernel',sigma, this.w,'x',this.h)

      this.kern = new Float32Array( this.w*this.h)
      this.cx = Math.floor(this.w / 2);
      this.cy = Math.floor(this.h / 2);
      this.sigma = sigma

      var sigma2Sqr = 2.0 * sigma * sigma;

      for( var y = 0; y < this.h; y++ ) {
          for( var x = 0; x < this.w; x++ ) {
              var rx = (x - this.cx);
              var ry = (y - this.cy);
              var d2 = rx*rx + ry*ry;
              this.kern[y*this.w + x] = this.gausVal(d2) //Math.exp( -d2 / sigma2Sqr );
          }
      }
    }

    gausVal( d ){
      return Math.exp( -d/(2*this.sigma*this.sigma)   )
    }

    whats(x,y){
      return this.kern[(y+this.cy)*this.w + x+this.cx]
    }

  }

export class bilateralFilter {
    constructor() {
        this.sigma = 4
        this.kernelsize = 16
        this.kernel = new gaussianKernel(this.sigma, this.kernelsize)
    }

    run(data, width, height) {
        this.kernel = new gaussianKernel(this.sigma, this.kernelsize)
        console.log('started')
        var dataOut = new Uint8Array(data.length);
        for (let i = 0 ; i < data.length ; ++i)
        {
            dataOut[i] = data[i];
        }
        var intens = getIntensities(data, width, height)

        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var i = y * width + x
                var w1 = intens[i]
                var normFactor = 0
                var wout = 0
                var rgb = [0.00000001, 0.0000001, 0.000000001]

                for (var y2 = -this.kernel.cy + 1; y2 < this.kernel.cy; y2++) {
                    for (
                        var x2 = -this.kernel.cx + 1;
                        x2 < this.kernel.cx;
                        x2++
                    ) {
                        if (
                            y + y2 > 0 &&
                            x + x2 > 0 &&
                            y + y2 < height &&
                            x + x2 < width
                        ) {
                            var i2 = (y + y2) * width + (x + x2)
                            var w2 = intens[i2]
                            var distI = Math.sqrt(Math.pow(w1 - w2, 2))
                            var dw = this.kernel.gausVal(distI)
                            var weight = this.kernel.whats(x2, y2) * dw
                            normFactor += weight
                            wout += weight * w2
                            rgb[0] += weight * data[3 * i2]
                            rgb[1] += weight * data[3 * i2 + 1]
                            rgb[2] += weight * data[3 * i2 + 2]
                        }
                    }
                }

                normFactor = Math.max(0.00001, Math.abs(normFactor))
                wout = wout / normFactor
                var woutF = wout / 180
                var i4 = 3 * i

                dataOut[i4] = rgb[0] / normFactor
                dataOut[i4 + 1] = rgb[1] / normFactor
                dataOut[i4 + 2] = rgb[2] / normFactor

                //dataOut.data[i4]= dataOut.data[i4+1] = dataOut.data[i4+2] = wout
            }
        }

        console.log('bilateral filter done');
        return dataOut;
    }
}





































export class integralHistogram {
    constructor(data, width, height, bins = 16) {
        this.kernel = new gaussianKernel(this.sigma, this.kernelsize)
        this.binCount = bins
        this.bins = new Array(bins)
        this.binwidth = 0
        var start = new Date().getTime()
        console.log('started integral histogram')
        this.intens = getIntensities(data, width, height) //convert to greyscale intensity values

        this.bins = new Uint32Array(bins * this.intens.length)

        this.width = width
        this.height = height

        this.binwidth = 255 / this.binCount

        //
        // This code is cleaner and just as fast as the other seperated one
        //
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                var indx = y * this.width + x
                var meI = this.intens[indx]
                var mybin = Math.round(meI / this.binwidth)
                for (var j = 0; j < this.binCount; j++) {
                    var left = this.whatsAt(x - 1, y, j)
                    var up = this.whatsAt(x, y - 1, j)
                    var ul = this.whatsAt(x - 1, y - 1, j)
                    var indxb = indx * this.binCount + j
                    //var me = 1* ( meI > j*binwidth && meI < (j+1)*binwidth )
                    this.bins[indxb] = left + up - ul
                }
                this.bins[indx * this.binCount + mybin] += 1
            }
        }
        console.log('integral histogram done in ', new Date().getTime() - start)
    }

    whatsAt(x, y, bin) {
        if (x < 0 || y < 0) {
            return 0
        }
        var x2 = Math.min(this.width - 1, x)
        var y2 = Math.min(this.height - 1, y)
        //var b2 =  Math.max( 0, Math.min(bin, this.bins.length-1))
        var indx = y2 * this.width + x2
        return this.bins[indx * this.binCount + bin]
    }

    getblock(x, y, x2, y2, bin) {
        var lr = this.whatsAt(x2, y2, bin)
        var ul = this.whatsAt(x, y, bin)
        var ll = this.whatsAt(x, y2, bin)
        var ur = this.whatsAt(x2, y, bin)
        var result = lr - ur - ll + ul
        return result
    }
}

export class bilateralFilterFast {
    constructor(bins = 32) {
        this.bins = bins
        this.kernelsize = 32
        this.kernel = null //new gaussianKernel(this.sigma, this.kernelsize)
        this.hist = null
        this.sigma = 4
    }

    run(data, width, height) {
        var start = new Date().getTime()
        console.log('started bilateral filter')
        this.kernel = new gaussianKernel(this.sigma, 2 * this.bins, 1)
        var dataOut = new Uint8Array(data.length);
        for (let i = 0 ; i < data.length ; ++i)
        {
            dataOut[i] = data[i];
        }
        this.hist = new integralHistogram(data, width, height, this.bins)

        var wid = width
        var hei = height
        for (var y = 0; y < hei; y++) {
            for (var x = 0; x < wid; x++) {
                var indx = y * wid + x
                var myIntens = this.hist.intens[indx]
                var mybin = Math.round(myIntens / (this.hist.binwidth + 0.5))
                var kappa = 0
                var result = 0
                for (var j = 0; j < this.bins; j++) {
                    var diff = j - mybin
                    var gauW = this.kernel.whats(diff, 0)
                    var histVal = this.hist.getblock(
                        x - this.kernelsize,
                        y - this.kernelsize,
                        x + this.kernelsize,
                        y + this.kernelsize,
                        j
                    )
                    kappa += histVal * gauW
                    var colorval = j / this.bins
                    result += histVal * gauW * colorval
                }
                result = result / kappa
                var indx4 = indx * 3
                dataOut[indx4] = result * 256 //* data.data[indx4]
                dataOut[indx4 + 1] = result * 256 //* data.data[indx4+1]
                dataOut[indx4 + 2] = result * 256 //* data.data[indx4+2]
            }
        }
        console.log('bilateral filter done in ', new Date().getTime() - start)
        return dataOut
    }
}

































//https://blog.csdn.net/jia20003/article/details/7740683

export class BilateralFilter {
    constructor(ds = 1.0, rs = 1.0)
    {
        this.factor = -0.5;
        this.ds = 1.0; // distance sigma
        this.rs = 1.0; // range sigma
        this.radius = Math.max(ds, rs); // half length of Gaussian kernel
        this.cWeightTable;
        this.cWeightTableEdgeLen = 2 * this.radius + 1;
        this.sWeightTable;
        this.width;
        this.height;

        this.buildDistanceWeightTable();
        this.buildSimilarityWeightTable();
    }

	buildDistanceWeightTable() {
		this.cWeightTable = new Float32Array(this.cWeightTableEdgeLen * this.cWeightTableEdgeLen);
		for(let semirow = -this.radius; semirow <= this.radius; semirow++) {
			for(let semicol = - this.radius; semicol <= this.radius; semicol++) {
				// calculate Euclidean distance between center point and close pixels
				let delta = Math.sqrt(semirow * semirow + semicol * semicol)/ this.ds;
				let deltaDelta = delta * delta;
				this.cWeightTable[(semirow+this.radius)*this.cWeightTableEdgeLen + semicol+this.radius] = Math.exp(deltaDelta * this.factor);
			}
		}
	}

	/**
	 * for gray image
	 * @param row
	 * @param col
	 * @param inPixels
	 */
	buildSimilarityWeightTable() {
		this.sWeightTable = new Float32Array(256); // since the color scope is 0 ~ 255
		for(let i=0; i<256; i++) {
			let delta = Math.sqrt(i * i ) / this.rs;
			let deltaDelta = delta * delta;
			this.sWeightTable[i] = Math.exp(deltaDelta * this.factor);
		}
	}

	filter(inPixels, outPixels, width, height) {
        //int sigmaMax = (int)Math.max(ds, rs);
        //radius = (int)Math.ceil(2 * sigmaMax);

        let index = 0;
		let redSum = 0, greenSum = 0, blueSum = 0;
		let csRedWeight = 0, csGreenWeight = 0, csBlueWeight = 0;
		let csSumRedWeight = 0, csSumGreenWeight = 0, csSumBlueWeight = 0;
        for(let row=0; row<height; row++) {
        	let ta = 0, tr = 0, tg = 0, tb = 0;
        	for(let col=0; col<width; col++) {
        		index = (row * width + col) * 3;
        		ta = 0xff;
                tr = inPixels[index];
                tg = inPixels[index + 1];
                tb = inPixels[index + 2];
                let rowOffset = 0, colOffset = 0;
                let index2 = 0;
                let ta2 = 0, tr2 = 0, tg2 = 0, tb2 = 0;
        		for(let semirow = -this.radius; semirow <= this.radius; semirow++) {
        			for(let semicol = - this.radius; semicol <= this.radius; semicol++) {
        				if((row + semirow) >= 0 && (row + semirow) < height) {
        					rowOffset = row + semirow;
        				} else {
        					rowOffset = 0;
        				}

        				if((semicol + col) >= 0 && (semicol + col) < width) {
        					colOffset = col + semicol;
        				} else {
        					colOffset = 0;
        				}
        				index2 = (rowOffset * width + colOffset) * 3;
        				ta2 = 0xff;
        		        tr2 = inPixels[index2];
        		        tg2 = inPixels[index2 + 1];
        		        tb2 = inPixels[index2 + 2];

        		        csRedWeight = this.cWeightTable[(semirow+this.radius)*this.cWeightTableEdgeLen + semicol+this.radius] * this.sWeightTable[(Math.abs(tr2 - tr))];
        		        csGreenWeight = this.cWeightTable[(semirow+this.radius)*this.cWeightTableEdgeLen + semicol+this.radius] * this.sWeightTable[(Math.abs(tg2 - tg))];
        		        csBlueWeight = this.cWeightTable[(semirow+this.radius)*this.cWeightTableEdgeLen + semicol+this.radius] * this.sWeightTable[(Math.abs(tb2 - tb))];

        		        csSumRedWeight += csRedWeight;
        		        csSumGreenWeight += csGreenWeight;
        		        csSumBlueWeight += csBlueWeight;
        		        redSum += (csRedWeight * tr2);
        		        greenSum += (csGreenWeight * tg2);
        		        blueSum += (csBlueWeight * tb2);
        			}
        		}

				tr = Math.floor(redSum / csSumRedWeight);
				tg = Math.floor(greenSum / csSumGreenWeight);
				tb = Math.floor(blueSum / csSumBlueWeight);
				outPixels[index] = tr;
				outPixels[index + 1] = tg;
				outPixels[index + 2] = tb;

                // clean value for next time...
                redSum = greenSum = blueSum = 0;
                csRedWeight = csGreenWeight = csBlueWeight = 0;
                csSumRedWeight = csSumGreenWeight = csSumBlueWeight = 0;
        	}
        }
        return outPixels;
	}
}