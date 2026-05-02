function FontFaceObserver(family, descriptors) {
  this.family = family;
}
FontFaceObserver.prototype.load = function (text, timeout) {
  return Promise.resolve();
};
FontFaceObserver.prototype.check = function (text, timeout) {
  return Promise.resolve(true);
};
module.exports = FontFaceObserver;
module.exports.default = FontFaceObserver;
