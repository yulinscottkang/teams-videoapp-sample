import { app, video } from "@microsoft/teams-js";

import { WebglVideoFilter } from "./webgl-video-filter";
import { WebglVideoFilters } from "./webgl-video-filters"
import { WebglFaceDetector } from "./webgl-face-detector"

app.initialize().then(() => {
// This is the effect for processing
let appliedEffect = {
  pixelValue: 100,
  proportion: 3,
};

let effectIds = {
  "half":           "filter-half",
  "gray":           "filter-gray",
  "identity":       "filter-identity",
  "box-blur":       "filter-box-blur",
  "gaussian-blur":  "filter-gaussian-blur",
  "sharpen":        "filter-sharpen",
  "unsharpen":      "filter-unsharpen",
  "edge-detection": "filter-edge-detection",
  "emboss":         "filter-emboss",
  "face":           "filter-face",
  "mask":           "filter-mask"
}

// This is the effect linked with UI
let uiSelectedEffect = {};
let selectedEffectId = undefined;
let errorOccurs = false;
let useSimpleEffect = false;
function simpleHalfEffect(videoFrame) {
  const maxLen =
    (videoFrame.height * videoFrame.width) /
      Math.max(1, appliedEffect.proportion) - 4;

  for (let i = 1; i < maxLen; i += 4) {
    //smaple effect just change the value to 100, which effect some pixel value of video frame
    videoFrame.data[i + 1] = appliedEffect.pixelValue;
  }
}

let canvas = new OffscreenCanvas(480,360);
let videoFilter = new WebglVideoFilter(canvas);
videoFilter.init();

const identityFilter = new WebglVideoFilters("identity");
const boxBlurFilter = new WebglVideoFilters("box-blur");
const gaussianBlurFilter = new WebglVideoFilters("gaussian-blur");
const sharpenFilter = new WebglVideoFilters("sharpen");
const unsharpenFilter = new WebglVideoFilters("unsharpen");
const edgeDetectionFilter = new WebglVideoFilters("edge-detection");
const embossFilter = new WebglVideoFilters("emboss");
const faceDetector = new WebglFaceDetector();
faceDetector.init();

//Sample video effect
function videoFrameHandler(videoFrame, notifyVideoProcessed, notifyError) {
  switch (selectedEffectId) {
    case effectIds.half:
      simpleHalfEffect(videoFrame);
      break;
    case effectIds.gray:
      videoFilter.processVideoFrame(videoFrame);
      break;
    case effectIds["identity"]:
      identityFilter.processVideoFrame(videoFrame);
      break;
    case effectIds["box-blur"]:
      boxBlurFilter.processVideoFrame(videoFrame);
      break;
    case effectIds["gaussian-blur"]:
      gaussianBlurFilter.processVideoFrame(videoFrame);
      break;
    case effectIds["sharpen"]:
      sharpenFilter.processVideoFrame(videoFrame);
      break;
    case effectIds["unsharpen"]:
      unsharpenFilter.processVideoFrame(videoFrame);
      break;
    case effectIds["edge-detection"]:
      edgeDetectionFilter.processVideoFrame(videoFrame);
      break;
    case effectIds["emboss"]:
      embossFilter.processVideoFrame(videoFrame);
      break;
    case effectIds["face"]:
      faceDetector.processVideoFrame(videoFrame);
      break;
    case effectIds["mask"]:
      faceDetector.processVideoFrame(videoFrame, "/img/comedy-glasses.png");
      break;
    default:
      break;
  }

  //send notification the effect processing is finshed.
  notifyVideoProcessed();

  //send error to Teams if any
  // if (errorOccurs) {
  //   notifyError("some error message");
  // }
}

function clearSelect() {
  document.querySelectorAll(".filter").forEach(elm => elm.classList.remove("selected"));
}

function effectParameterChanged(effectId) {
  console.log(effectId);
  if (selectedEffectId === effectId) {
    console.log('effect not changed');
    return;
  }
  selectedEffectId = effectId;

  clearSelect();
  switch (selectedEffectId) {
    case effectIds.half:
      console.log("current effect: half");
      document.getElementById("filter-half").classList.add("selected");
      break;
    case effectIds.gray:
      console.log("current effect: gray");
      document.getElementById("filter-gray").classList.add("selected");
      break;
    case effectIds["identity"]:
    case effectIds["box-blur"]:
    case effectIds["gaussian-blur"]:
    case effectIds["sharpen"]:
    case effectIds["unsharpen"]:
    case effectIds["edge-detection"]:
    case effectIds["emboss"]:
    case effectIds["face"]:
    case effectIds["mask"]:
      document.getElementById(selectedEffectId).classList.add("selected");
      break;
    default:
      console.log("effect cleared");
      break;
  }
}

video.registerForVideoEffect(effectParameterChanged);
video.registerForVideoFrame(videoFrameHandler, {
  format: "NV12",
});

const filters = document.querySelectorAll(".filter");
filters.forEach(filter => {
  filter.addEventListener("click", function () {
    if (selectedEffectId === filter.id) {
      return;
    }
    video.notifySelectedVideoEffectChanged("EffectChanged", filter.id);
  });
});

});
