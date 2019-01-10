const app = getApp()
const Util = require('../../utils/util.js')

Page({
  data: {
    available: false,
    discovering: false,
    deviceId: '',
    serviceId: '',
    characteristicId: '',
    devices: [],
    devicesStr: '',
    deviceIndex: 0,
    dataId: '',
  },
  onLoad() {
    // console.log(Util.md5('123'))
  },
  opendoor(e) {
    let id = e.target.dataset.id;
    console.info(124, id)

    // if (this.data.devicesStr && id == this.data.dataId) {
    //   console.info('连接')
    //   this.connectBluetooth()
    // } else if (this.data.devicesStr && id != this.data.dataId) {
    //   this.watchBluetoothStateChange()
    //   this.searchBluetooth()
    //   console.info('再次连接')
    // } else {
    this.initBluetooth()
    console.info('首次连接')
    // }
    this.setData({
      dataId: id
    })
  },
  initBluetooth() {
    let that = this;
    wx.openBluetoothAdapter({
      success(res) {
        console.log("初始化蓝牙模块 --- 已开启")
        that.watchBluetoothStateChange()
        that.searchBluetooth()
      },
      fail(err) {
        console.log("初始化蓝牙模块 --- 未开启")
        that.watchBluetoothStateChange()
        if (err.errCode == 10001) {
          wx.showToast({
            title: '蓝牙未开启',
            icon: 'none'
          })
        }
      }
    })
  },
  /**
   * 监听蓝牙适配器状态变化事件
   */
  watchBluetoothStateChange() {
    let that = this;
    wx.onBluetoothAdapterStateChange((res) => {
      console.log("监听蓝牙状态改变")
      console.log(res)
      /**
       * 搜索状态
       */
      if (that.data.discovering != res.discovering) {
        that.setData({
          discovering: res.discovering
        })
      }
      /**
       * 蓝牙状态
       */
      if (that.data.available != res.available) {
        that.setData({
          available: res.available
        })
        if (!res.available) {
          wx.showToast({
            title: '蓝牙未开启',
            icon: 'none'
          })
          console.log('蓝牙适配器不可用')
        } else {
          if (!res.discovering && !that.data.devices.length) {
            that.searchBluetooth()
          }
        }
      }
    })
  },
  /**
   * 查找设备
   */
  searchBluetooth() {
    let that = this;
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success(res) {
        console.log("查找设备")
        that.watchBluetoothFound()
        setTimeout(that.stopSearchBluetooth, 5000)
      }
    })
  },
  /**
   * 监听寻找到新设备
   */
  watchBluetoothFound() {
    let that = this;
    wx.onBluetoothDeviceFound(function(res) {

      let device = res.devices[0]
      console.info('shebei', device, device.localName)
      if (device.localName && device.localName.indexOf(`ET01-${that.data.dataId}`) > -1) {
        console.log(`查找到 ET01-${that.data.dataId}`, '设备id', device.deviceId)

        that.setData({
          devicesStr: device.deviceId
        })
        console.info('连接成功---', that.data.devicesStr)
        that.connectBluetooth()

        // 连接成功 需要断开蓝牙搜索
        that.stopSearchBluetooth()
      }
    })
  },
  /**
   * 停止查找
   */
  stopSearchBluetooth() {
    let that = this;
    wx.stopBluetoothDevicesDiscovery({
      success: function(res) {
        console.log("停止查找")
      }
    })
  },
  /**
   * 获取设备列表
   */
  getBluetoothDevices() {
    let that = this;
    wx.getBluetoothDevices({
      success: function(res) {
        console.log('获取已发现的蓝牙设备', res.devices)
        let devices = res.devices.filter((item) => item.localName == "JDY-16")
        if (devices.length) {
          that.setData({
            devices: devices
          })
          console.log(that.data.devices)
        }
      }
    })
  },
  /**
   * 连接设备
   */
  connectBluetooth() {
    console.info('connectBluetooth', this.data.devicesStr)
    let that = this;
    wx.createBLEConnection({
      deviceId: that.data.devicesStr,
      success(res) {
        console.log("连接成功设备---" + JSON.stringify(res))
        that.getBluetoothServers()
      },
      fail(err) {
        that.closeConnectBluetooth()
        console.log("连接失败，结束---")
      }
    })
  },
  /**
   * 断开连接
   */
  closeConnectBluetooth() {
    let that = this;
    wx.closeBLEConnection({
      deviceId: that.data.devicesStr,
      success(res) {
        console.log("手动断开连接")
      }
    })
    wx.closeBluetoothAdapter({
      success(res) {
        console.log('断开蓝牙', res)
        that.setData({
          deviceId: '',
          serviceId: '',
          characteristicId: '',
          devices: [],
          devicesStr: '',
          deviceIndex: 0,
          dataId: '',
        })
      }
    })
  },
  /**
   * 获取设备服务
   */
  getBluetoothServers() {
    let that = this;
    wx.getBLEDeviceServices({
      deviceId: that.data.devicesStr,
      success(res) {
        console.log('获取设备服务', res.services)
        that.setData({
          serviceId: res.services[0].uuid
        })
        that.getBluetoothCharacteristics()
      },
    })
  },
  /**
   * 获取设备某个服务特征值列表
   */
  getBluetoothCharacteristics() {
    let that = this;
    wx.getBLEDeviceCharacteristics({
      deviceId: that.data.devicesStr,
      serviceId: that.data.serviceId,
      success(res) {
        console.info('获取设备某个服务特征值列表', res)
        that.setData({
          characteristicId: res.characteristics[0].uuid
        })
        that.notifyBluetoothCharacteristicValueChange()
        // for (let i = 0; i < res.characteristics.length; i++) {
        //   if (res.characteristics[i].properties.write) {
        //     console.log(res.characteristics[i])
        //     that.setData({ characteristicId: res.characteristics[i].uuid })
        //     that.notifyBluetoothCharacteristicValueChange()
        //     break
        //   }
        // }
      },
    })
  },
  /**
   * 启用设备特征值变化时的 notify 功能
   */
  notifyBluetoothCharacteristicValueChange() {
    let that = this;
    wx.notifyBLECharacteristicValueChange({
      deviceId: that.data.devicesStr,
      serviceId: that.data.serviceId,
      characteristicId: that.data.characteristicId,
      state: true,
      type: 'notification',
      success(res) {
        console.log("启用设备特征值变化时的 notify 功能", res)
        that.watchBluetoothCharacteristicValueChange()
      },
    })
  },
  /**
   * 监听设备的特征值变化
   */
  watchBluetoothCharacteristicValueChange() {
    let that = this;
    console.log("监听设备的特征值变化")
    // wx.onBLECharacteristicValueChange(function (res) {
    //   console.log("监听到返回信息", res)
    //   console.log(that.hexToStr(that.buf2hex(res.value)))
    //   if (that.hexToStr(that.buf2hex(res.value)) == '666666') {
    //     that.setData({
    //       deviceId: that.data.devicesStr
    //     })
    //     that.writeBluetoothCharacteristicValue('02')
    //   } else if (that.hexToStr(that.buf2hex(res.value)) == '200') {
    //     that.closeConnectBluetooth()
    //   }
    // })
    // setTimeout(() => {
    //   that.writeBluetoothCharacteristicValue('01')
    // }, 20)

    wx.onBLECharacteristicValueChange(function(res) {
      console.log('onBLECharacteristicValueChange', res)
      console.log('返回数据', that.ab2hex(res.value))
      if (that.ab2hex(res.value) == '7b010403a000dd') {
        wx.showModal({
          title: '提示',
          content: '开门成功',
          showCancel: false
        })
      } else {
        wx.showModal({
          title: '提示',
          content: '开门失败',
          showCancel: false
        })
      }
      // console.info('hex', that.hexToString(that.ab2hex(res.value)))
      // console.log('返回数据',that.hexToStr(that.buf2hex(res.value)))
      // if (that.hexToStr(that.buf2hex(res.value)) == '200') {
      that.closeConnectBluetooth()
      // }
    })

    setTimeout(() => {
      that.writeBluetoothCharacteristicValue()
    }, 20)


  },
  /**
   * 向设备特征值中写入二进制数据
   */
  writeBluetoothCharacteristicValue(type) {
    let that = this;
    // if (type == '01') {
    //   var str = Util.md5("5678") + "cd12345678"
    //   var arr = that.strToHex(str)
    //   var buffer = that.strToBuf(arr, type)
    // } else if (type == '02') {
    //   var str = Util.md5("5678cd12345678666666")
    //   var arr = that.strToHex(str)
    //   var buffer = that.strToBuf(arr, type)
    // } else {
    //   console.log('参数错误')
    //   return false
    // }

    // console.info('buffer', buffer)

    // 开门 

    var arr = ['7A', '01', '04', '03', 'A0', '00', 'DE']
    console.info(8888, that.strToBuf(arr))

    wx.writeBLECharacteristicValue({
      deviceId: that.data.devicesStr,
      serviceId: that.data.serviceId,
      characteristicId: that.data.characteristicId,
      value: that.strToBuf(arr),
      success(res) {
        console.log("写入成功")
      },
      fail(res) {
        console.log("写入失败 结束")
        // let deviceIndex = that.data.deviceIndex;
        // if (that.data.devices.length - 1 > deviceIndex) {
        //   console.log("写入失败 连接下一个设备")
        //   that.setData({
        //     deviceIndex: deviceIndex + 1
        //   })
        //   that.connectBluetooth()
        // } else {
        //   console.log("写入失败 结束")
        // }
      }
    })
  },

  /**
   * ArrayBuffer转16进制
   */
  buf2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => x)
  },
  /**
   * 字符串转hex
   */
  strToHex(str) {
    var arr = [];
    for (var i = 0; i < str.length; i++) {
      arr.push(str.charCodeAt(i).toString(16))
    }
    return arr
  },
  /**
   * hex转ArrayBuffer
   */
  strToBuf(arr) {
    var length = arr.length
    var buffer = new ArrayBuffer(length + 2)
    var dataview = new DataView(buffer)
    // dataview.setUint8(0, '0x' + type)
    // dataview.setUint8(1, '0x' + (length > 16 ? length.toString(16) : '0' + length.toString(16)))
    for (let i = 0; i < length; i++) {
      dataview.setUint8(i, '0x' + arr[i])
    }
    return buffer
  },
  /**
   * hex转字符串
   */
  hexToStr(hex) {
    let arr = Array.prototype.map.call(hex, x => String.fromCharCode(x))
    return arr.join('')
  },

  // ArrayBuffer转16进度字符串示例
  ab2hex(buffer) {
    const hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function(bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('')
  },
  // 16进度 转化 string
  hexToString(hex) {
    var string = '';
    for (var i = 0; i < hex.length; i += 2) {
      string += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return string;
  }
})