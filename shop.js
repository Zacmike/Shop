const { getUserBalance, setUserBalance } = require('./currency');

async function buyItem(userId, itemId, itemCost) {
    const balance = await getUserBalance(userId);

    if (balance < itemCost) {
        throw new Error('Недостаточно средств для покупки этого предмета.');
    }

    await setUserBalance(userId, balance - itemCost);
    // Логика добавления предмета пользователю (например, обновление инвентаря в базе данных)
    // Пример:
    // await addItemToUserInventory(userId, itemId);

    return true;
}

module.exports = { buyItem };