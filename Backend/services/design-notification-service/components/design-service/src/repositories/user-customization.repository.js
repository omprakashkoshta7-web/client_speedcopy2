const UserCustomization = require('../models/user-customization.model');

const create = (payload) => UserCustomization.create(payload);

const findOwnedById = (userId, id) =>
    UserCustomization.findOne({ _id: id, userId }).populate('templateId');

const findById = (id) => UserCustomization.findById(id).populate('templateId');

const listForUser = (userId, filter = {}) =>
    UserCustomization.find({ userId, ...filter }).sort({ updatedAt: -1 });

const updateOwnedById = (userId, id, payload) =>
    UserCustomization.findOneAndUpdate({ _id: id, userId }, payload, {
        new: true,
        runValidators: true,
    }).populate('templateId');

const deleteOwnedById = (userId, id) =>
    UserCustomization.findOneAndDelete({ _id: id, userId });

module.exports = {
    create,
    findOwnedById,
    findById,
    listForUser,
    updateOwnedById,
    deleteOwnedById,
};
