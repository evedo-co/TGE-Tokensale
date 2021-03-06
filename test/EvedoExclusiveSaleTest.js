const EvedoTokenContract = artifacts.require('EvedoToken')
const EvedoExclusiveSaleContract = artifacts.require('EvedoExclusiveSale')
const BigNumber = require('bignumber.js')
const chai = require('chai')
chai.use(require('chai-bignumber')(BigNumber))
const expect = chai.expect
const expectRevert = require('./helpers').expectRevert

contract('EvedoExclusiveSale', function (accounts) {
  let tokenContract
  let crowdsaleContract
  const creatorAccount = accounts[0]
  const userAccount = accounts[1]
  const decimals = 18
  const totalNumberOfTokens = new BigNumber(160).times(new BigNumber(10).pow(6 + decimals))
  const tokensForSale = new BigNumber(2000 * 2700).times(new BigNumber(10).pow(decimals))

  let init = async () => {
    tokenContract = await EvedoTokenContract.new(totalNumberOfTokens)
    crowdsaleContract = await EvedoExclusiveSaleContract.new(2700, creatorAccount, tokenContract.address)
    // the contract needs to own the takens for sale
    tokenContract.transfer(crowdsaleContract.address, tokensForSale)
  }

  describe('Token sale', () => {
    beforeEach(init)

    it('Sender should be able to buy tokens', async () => {
      let initialOwnerEthBalance = await web3.eth.getBalance(creatorAccount)
      console.log('Initial owner Eth balance', web3.fromWei(initialOwnerEthBalance).toString())
      let initialUserEthBalance = await web3.eth.getBalance(userAccount)
      console.log('Initial user Eth balance', web3.fromWei(initialUserEthBalance).toString())
      let ownerTokenBalance = await tokenContract.balanceOf.call(creatorAccount)
      console.log('Owner token balance', ownerTokenBalance.toNumber())
      let crowdsaleTokenBalance = await tokenContract.balanceOf.call(crowdsaleContract.address)
      console.log('Crowdsale contract token balance', crowdsaleTokenBalance.toNumber())

      // when user sends 1 eth to EvedoTokenSale contract
      await crowdsaleContract.sendTransaction({from: userAccount, value: web3.toWei(1, 'ether')})
      let userTokenBalance = await tokenContract.balanceOf.call(userAccount)
      console.log('User Token Balance', userTokenBalance.toNumber())
      const expectedTokenBalance = new BigNumber(2700).times(new BigNumber(10).pow(decimals))
      expect(userTokenBalance).to.bignumber.equal(expectedTokenBalance)
      crowdsaleTokenBalance = await tokenContract.balanceOf.call(crowdsaleContract.address)
      console.log('Crowdsale contract token balance after transfer', crowdsaleTokenBalance.toNumber())

      // check that funds have been transferred
      let ownerEthBalanceAfterSale = await web3.eth.getBalance(creatorAccount)
      console.log('Owner Balance After sale', web3.fromWei(ownerEthBalanceAfterSale).toString())
      expect(web3.fromWei(ownerEthBalanceAfterSale.minus(initialOwnerEthBalance))).to.bignumber.be.greaterThan(0.9)
    })

    it('Sender needs to send eth', async () => {
      // when user sends 0 eth to EvedoTokenSale contract
      await expectRevert(crowdsaleContract.sendTransaction({from: userAccount, value: web3.toWei(0, 'ether')}))
    })

    it('Sender should be able to send 2000 eth max', async () => {
      await crowdsaleContract.sendTransaction({from: userAccount, value: web3.toWei(2000, 'ether')})
      await expectRevert(crowdsaleContract.sendTransaction({from: userAccount, value: web3.toWei(10, 'ether')}))
      let userTokenBalance = await tokenContract.balanceOf.call(userAccount)
      console.log('User Token Balance', userTokenBalance.toNumber())
      const expectedTokenBalance = new BigNumber(2700 * 2000).times(new BigNumber(10).pow(decimals))
      expect(userTokenBalance).to.bignumber.equal(expectedTokenBalance)
    })
  })

  describe('Open/Close', () => {
    beforeEach(init)

    it('when closed no sale is possible', async () => {
      await crowdsaleContract.close()
      await expectRevert(crowdsaleContract.sendTransaction({from: userAccount, value: web3.toWei(1, 'ether')}))
    })

    it('Only owner can open/close', async () => {
      await expectRevert(crowdsaleContract.open({from: userAccount}))
      await expectRevert(crowdsaleContract.close({from: userAccount}))
    })
  })

  describe('Finalise', () => {
    beforeEach(init)

    it('when finalised no sale is possible and unsold tokens are returned to owner', async () => {
      // send 1000 eth and get 2 700 000 tokens
      await crowdsaleContract.sendTransaction({from: userAccount, value: web3.toWei(1000, 'ether')})
      let crowdSaleTokenBalance = await tokenContract.balanceOf.call(crowdsaleContract.address)
      expect(crowdSaleTokenBalance).bignumber.to.equal(new BigNumber(1000 * 2700).times(new BigNumber(10).pow(decimals)))
      await crowdsaleContract.finalize()
      // try to buy more
      await expectRevert(crowdsaleContract.sendTransaction({from: userAccount, value: web3.toWei(1, 'ether')}))
      crowdSaleTokenBalance = await tokenContract.balanceOf.call(crowdsaleContract.address)
      expect(crowdSaleTokenBalance).bignumber.to.equal(0)
      let ownerTokenBalance = await tokenContract.balanceOf.call(creatorAccount)
      expect(ownerTokenBalance).bignumber.to.equal(totalNumberOfTokens.minus(new BigNumber(1000 * 2700).times(new BigNumber(10).pow(decimals))))
    })

    it('Only owner can finalise', async () => {
      await expectRevert(crowdsaleContract.finalize({from: userAccount}))
    })
  })
})
