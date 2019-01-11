const app = getApp()
const Util = require('../../utils/util.js')

Page({
  data: {
    available: false, // 设备可用
    discovering: false,  // 搜索状态
    serviceId: '', // 服务Id
    characteristicId: '', // 特征值
    deviceId: '', // mac 地址 （ios的mac地址是UUID，由于隐私保护的原因引起的）
    name: '', // 设备编号 完整： ET01-XXXXX
  },
  onLoad() {
    // console.log(Util.md5('123'))
  },
  opendoor(e) {
    let id = e.target.dataset.id;
    console.info('设备的名称', id)
    this.setData({
      name: id
    })

    // 仅仅是单个设备 (wx.closeBLEConnection 只需要断开这个连接即可)
    // if (this.data.serviceId){
    //   this.this.connectBluetooth()
    // }else {
    //   this.initBluetooth()
    // }

    // 多个设备连接（切换设备的时候的需要 wx.closeBLEConnection 和 wx.closeBluetoothAdapter 释放资源）
    this.initBluetooth()
  },
  initBluetooth() {
    let that = this;
    
    // 版本过低兼容
    if (!wx.openBluetoothAdapter) {
      wx.showModal({
        title: '提示',
        showCancel: false,
        content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。',
      })
      return;
    }

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
      console.log("监听蓝牙状态改变", res)
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
            console.info(789)
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
        // 20s 停止搜索
        setTimeout(that.stopSearchBluetooth, 20000)
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
      if (device.localName && device.localName.indexOf(`ET01-${that.data.name}`) > -1) {
        console.log(`查找到 ET01-${that.data.name}`, '设备id', device.deviceId)

        that.setData({
          deviceId: device.deviceId
        })
        console.info('连接成功---', that.data.deviceId)
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
  // getBluetoothDevices() {
  //   let that = this;
  //   wx.getBluetoothDevices({
  //     success: function(res) {
  //       console.log('获取已发现的蓝牙设备', res.devices)
  //       let devices = res.devices.filter((item) => item.localName == "JDY-16")
  //       if (devices.length) {
  //         that.setData({
  //           devices: devices
  //         })
  //         console.log(that.data.devices)
  //       }
  //     }
  //   })
  // },
  /**
   * 连接设备
   */
  connectBluetooth() {
    console.info('connectBluetooth', this.data.deviceId)
    let that = this;
    wx.createBLEConnection({
      deviceId: that.data.deviceId,
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
    // 断开BLE的连接
    wx.closeBLEConnection({
      deviceId: that.data.deviceId,
      success(res) {
        console.log("手动断开连接")
      }
    })
     // 断开蓝牙的连接 （初始化所有的状态）
    wx.closeBluetoothAdapter({
      success(res) {
        console.log('断开蓝牙', res)
        that.setData({
          deviceId: '',
          serviceId: '',
          characteristicId: '',
          name: '',
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
      deviceId: that.data.deviceId,
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
      deviceId: that.data.deviceId,
      serviceId: that.data.serviceId,
      success(res) {
        console.info('获取设备某个服务特征值列表', res)
        that.setData({
          characteristicId: res.characteristics[0].uuid
        })
        that.notifyBluetoothCharacteristicValueChange()
      },
    })
  },
  /**
   * 启用设备特征值变化时的 notify 功能
   */
  notifyBluetoothCharacteristicValueChange() {
    let that = this;
    wx.notifyBLECharacteristicValueChange({
      deviceId: that.data.deviceId,
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
    
    wx.onBLECharacteristicValueChange(function(res) {

      console.log('onBLECharacteristicValueChange', res)
      console.log('返回数据', that.ab2hex(res.value))
      // 和硬件约定 7b010403a000dd 这个返回值是开门成功
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
      that.closeConnectBluetooth()
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

    // 开门指令 
    var arr = ['7A', '01', '04', '03', 'A0', '00', 'DE']
    console.info('开门指令 转化 Buffer', that.strToBuf(arr))

    wx.writeBLECharacteristicValue({
      deviceId: that.data.deviceId,
      serviceId: that.data.serviceId,
      characteristicId: that.data.characteristicId,
      value: that.strToBuf(arr),
      success(res) {
        console.log("写入成功")
      },
      fail(res) {
        console.log("写入失败 结束")
      }
    })
  },

  /**
   * hex转ArrayBuffer
   */
  strToBuf(arr) {
    var length = arr.length
    var buffer = new ArrayBuffer(length + 2)
    var dataview = new DataView(buffer)
    for (let i = 0; i < length; i++) {
      dataview.setUint8(i, '0x' + arr[i])
    }
    return buffer
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