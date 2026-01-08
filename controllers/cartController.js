const Cart = require('../models/Cart');
const Product = require('../models/Product');

// 1. Add to Cart
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user._id; // Get from Auth Middleware
        const qty = Number(quantity);

        if (!Number.isFinite(qty) || qty < 1) {
            return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
        }

        // Verify Product Exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Find if user already has a cart
        let cart = await Cart.findOne({ user: userId });

        if (cart) {
            // Debug Logs
            console.log(`[AddToCart] Checking for ProductID: ${productId}`);
            console.log(`[AddToCart] Existing IDs in Cart:`, cart.cartItems.map(p => p.product.toString()));

            // Check if product already exists in the cart
            const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);

            if (itemIndex > -1) {
                // Product exists, increment quantity instead of returning a conflict
                cart.cartItems[itemIndex].quantity += qty;
            } else {
                // Product does not exist, push new item
                cart.cartItems.push({ product: productId, quantity: qty });
            }
            await cart.save();
        } else {
            // No cart for this user, create a new one
            cart = await Cart.create({
                user: userId,
                cartItems: [{ product: productId, quantity: qty }]
            });
        }

        // Populate to match getCart format
        await cart.populate({
            path: 'cartItems.product',
            select: 'name price imageUrl'
        });

        res.status(200).json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get User's Cart
exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate({
            path: 'cartItems.product',
            select: 'name price imageUrl stock' // Only fetch what the UI needs
        });

        if (!cart) {
            return res.status(200).json({ success: true, cartItems: [] });
        }

        res.status(200).json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Update Cart Item Quantity
exports.updateCartItemQuantity = async (req, res) => {
    try {
        let { productId, newQuantity, quantity } = req.body;
        // Allow user to send "quantity" instead of "newQuantity"
        if (newQuantity === undefined) newQuantity = quantity;

        const userId = req.user._id;

        newQuantity = Number(newQuantity); // Ensure it's a number

        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        // Debug Logs
        console.log(`[UpdateCart] Searching for ProductID: ${productId}`);
        console.log(`[UpdateCart] Cart Items in DB:`, cart.cartItems.map(i => i.product.toString()));

        const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);

        if (itemIndex > -1) {
            if (newQuantity > 0) {
                cart.cartItems[itemIndex].quantity = newQuantity;
                await cart.save();

                // Populate to show full details in response
                await cart.populate({
                    path: 'cartItems.product',
                    select: 'name price imageUrl stock'
                });
                
                res.status(200).json({ 
                    success: true, 
                    cart,
                    message: `Quantity updated to ${newQuantity}`,
                    updatedItem: {
                        product: productId,
                        quantity: newQuantity
                    }
                });
            } else {
                // If quantity is 0 or less, remove the item
                cart.cartItems.splice(itemIndex, 1);
                await cart.save();
                
                await cart.populate({
                    path: 'cartItems.product',
                    select: 'name price imageUrl'
                });

                res.status(200).json({ 
                    success: true, 
                    cart,
                    message: "Item removed from cart",
                    updatedItem: {
                        product: productId,
                        quantity: 0
                    }
                });
            }
        } else {
            res.status(404).json({ success: false, message: "Item not found in cart" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Remove Item from Cart
exports.removeItemFromCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: userId });
        
        if (cart) {
            console.log(`[RemoveCart] Attempting to remove ProductID: ${productId}`);
            console.log(`[RemoveCart] Cart Items before:`, cart.cartItems.map(i => i.product.toString()));

            const initialLength = cart.cartItems.length;

            cart.cartItems = cart.cartItems.filter(item => item.product.toString() !== productId);

            if (cart.cartItems.length === initialLength) {
                return res.status(404).json({ success: false, message: "Item not found in cart" });
            }

            await cart.save();

            // Populate remaining items
            await cart.populate({
                path: 'cartItems.product',
                select: 'name price imageUrl stock'
            });
        }

        res.status(200).json({ success: true, message: "Item removed", cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
