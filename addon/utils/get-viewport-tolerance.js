export default function getViewportTolerance(adWidth, adHeight, percentVisible) {
  let ratio = 1 / Math.sqrt(1 / percentVisible);

  let newAreaWidth = adWidth * ratio;
  let newAreaHeight = adHeight * ratio;

  let horizontalTolerance = (adWidth - newAreaWidth) / 2;
  let verticalTolerance = (adHeight - newAreaHeight) / 2;

  return {
    top: verticalTolerance,
    bottom: verticalTolerance,
    left: horizontalTolerance,
    right: horizontalTolerance
  };
}
