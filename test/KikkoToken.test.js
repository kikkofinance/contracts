const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const KikkoToken = artifacts.require('KikkoToken');

contract('KikkoToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.kikko = await KikkoToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.kikko.owner()), owner);
        assert.equal((await this.kikko.operator()), owner);

        await expectRevert(this.kikko.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.kikko.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.kikko.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.kikko.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.kikko.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.kikko.updateKikkoSwapRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.kikko.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.kikko.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.kikko.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        await expectRevert(this.kikko.transferOperator(this.zeroAddress, { from: operator }), 'KIKKO::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        assert.equal((await this.kikko.transferTaxRate()).toString(), '500');
        assert.equal((await this.kikko.burnRate()).toString(), '20');

        await this.kikko.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.kikko.transferTaxRate()).toString(), '0');
        await this.kikko.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.kikko.transferTaxRate()).toString(), '1000');
        await expectRevert(this.kikko.updateTransferTaxRate(1001, { from: operator }), 'KIKKO::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.kikko.updateBurnRate(0, { from: operator });
        assert.equal((await this.kikko.burnRate()).toString(), '0');
        await this.kikko.updateBurnRate(100, { from: operator });
        assert.equal((await this.kikko.burnRate()).toString(), '100');
        await expectRevert(this.kikko.updateBurnRate(101, { from: operator }), 'KIKKO::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        await this.kikko.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '0');

        await this.kikko.transfer(bob, 12345, { from: alice });
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.kikko.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '494');

        await this.kikko.approve(carol, 22345, { from: alice });
        await this.kikko.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.kikko.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        await this.kikko.mint(alice, 10000000, { from: owner });
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '0');

        await this.kikko.transfer(bob, 19, { from: alice });
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.kikko.balanceOf(bob)).toString(), '19');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        assert.equal((await this.kikko.transferTaxRate()).toString(), '500');
        assert.equal((await this.kikko.burnRate()).toString(), '20');

        await this.kikko.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.kikko.transferTaxRate()).toString(), '0');

        await this.kikko.mint(alice, 10000000, { from: owner });
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '0');

        await this.kikko.transfer(bob, 10000, { from: alice });
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.kikko.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        assert.equal((await this.kikko.transferTaxRate()).toString(), '500');
        assert.equal((await this.kikko.burnRate()).toString(), '20');

        await this.kikko.updateBurnRate(0, { from: operator });
        assert.equal((await this.kikko.burnRate()).toString(), '0');

        await this.kikko.mint(alice, 10000000, { from: owner });
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '0');

        await this.kikko.transfer(bob, 1234, { from: alice });
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.kikko.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        assert.equal((await this.kikko.transferTaxRate()).toString(), '500');
        assert.equal((await this.kikko.burnRate()).toString(), '20');

        await this.kikko.updateBurnRate(100, { from: operator });
        assert.equal((await this.kikko.burnRate()).toString(), '100');

        await this.kikko.mint(alice, 10000000, { from: owner });
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '0');

        await this.kikko.transfer(bob, 1234, { from: alice });
        assert.equal((await this.kikko.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.kikko.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.kikko.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.kikko.balanceOf(this.kikko.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.kikko.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.kikko.maxTransferAmount()).toString(), '0');

        await this.kikko.mint(alice, 1000000, { from: owner });
        assert.equal((await this.kikko.maxTransferAmount()).toString(), '5000');

        await this.kikko.mint(alice, 1000, { from: owner });
        assert.equal((await this.kikko.maxTransferAmount()).toString(), '5005');

        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        await this.kikko.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.kikko.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        assert.equal((await this.kikko.isExcludedFromAntiWhale(operator)), false);
        await this.kikko.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.kikko.isExcludedFromAntiWhale(operator)), true);

        await this.kikko.mint(alice, 10000, { from: owner });
        await this.kikko.mint(bob, 10000, { from: owner });
        await this.kikko.mint(carol, 10000, { from: owner });
        await this.kikko.mint(operator, 10000, { from: owner });
        await this.kikko.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.kikko.maxTransferAmount()).toString(), '250');
        await expectRevert(this.kikko.transfer(bob, 251, { from: alice }), 'KIKKO::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.kikko.approve(carol, 251, { from: alice });
        await expectRevert(this.kikko.transferFrom(alice, carol, 251, { from: carol }), 'KIKKO::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.kikko.transfer(bob, 250, { from: alice });
        await this.kikko.transferFrom(alice, carol, 250, { from: carol });

        await this.kikko.transfer(this.burnAddress, 251, { from: alice });
        await this.kikko.transfer(operator, 251, { from: alice });
        await this.kikko.transfer(owner, 251, { from: alice });
        await this.kikko.transfer(this.kikko.address, 251, { from: alice });

        await this.kikko.transfer(alice, 251, { from: operator });
        await this.kikko.transfer(alice, 251, { from: owner });
        await this.kikko.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.kikko.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.kikko.swapAndLiquifyEnabled()), false);

        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        await this.kikko.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.kikko.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.kikko.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.kikko.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.kikko.transferOperator(operator, { from: owner });
        assert.equal((await this.kikko.operator()), operator);

        await this.kikko.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.kikko.minAmountToLiquify()).toString(), '100');
    });
});
