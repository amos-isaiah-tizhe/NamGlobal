const User = require("../models/User");

exports.toggle = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);

    const alreadyIn = user.wishlist.some((id) => id.toString() === productId);

    if (alreadyIn) {
      user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
    } else {
      user.wishlist.push(productId);
    }

    await user.save();
    res.json({ success: true, wishlisted: !alreadyIn });
  } catch (err) {
    next(err);
  }
};
