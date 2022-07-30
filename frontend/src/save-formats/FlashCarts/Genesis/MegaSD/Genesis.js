// There are two "styles" of save files that can be generated by a Mega SD:
// - The "old style" (from earlier firmware, it seems) which is byte expanded with 0xFF
// - The "new style" (from later firmware) which is not byte expanded and includes a "BUP2" prepended to the bgeinning
//
// I'm not sure which firmware revision changed this, nor do I know whether a Mega SD can read both types of files with the most recent firmware
//
// Here we will accept either type of file as input, and always output a "new style" file. This will allow people to use their
// old saves hopefully without making things complicated for the user.

import SaveFilesUtil from '../../../../util/SaveFiles';
import GenesisUtil from '../../../../util/Genesis';
import MathUtil from '../../../../util/Math';
import PaddingUtil from '../../../../util/Padding';
import Util from '../../../../util/util';

const MAGIC = 'BUP2';
const MAGIC_OFFSET = 0;
const MAGIC_ENCODING = 'US-ASCII';

const MEGA_SD_NEW_STYLE_PADDED_SIZE = 32768; // Both SRAM and EEPROM saves appear to always be padded out to this size

// const MEGA_SD_OLD_STYLE_FILL_BYTE = 0xFF; // "Old style" Mega SD files are byte expanded with a fill byte of 0xFF
const RAW_FILL_BYTE = 0x00;

const MEGA_SD_NEW_STYLE_PADDING_BYTE_SRAM = 0x00; // 3/4 of the new style files I was given were padded with 0x00 but one was 0xFF
const MEGA_SD_NEW_STYLE_PADDING_BYTE_EEPROM = 0xFF; // The example new style eeprom save was padded with 0xFF

const RAW_EEPROM_MIN_SIZE = 128; // Most EEPROM files we see (Wii VC, Everdrive) are this size for Wonder Boy in Monster World, even though the Mega SD only writes out 64 bytes (and GenesisPlus loads that fine)
const RAW_SRAM_MIN_SIZE = 16384; // 8kB, byte expanded

// When converting from raw, I'm concerned about removing padding then checking the resulting file size
// to see if it's an EEPROM save because ome games if saved early might not have much data, and so we might get an incorrect result.

function isNewStyleSave(flashCartArrayBuffer) {
  try {
    Util.checkMagic(flashCartArrayBuffer, MAGIC_OFFSET, MAGIC, MAGIC_ENCODING);
  } catch (e) {
    return false;
  }

  return ((flashCartArrayBuffer.byteLength > MAGIC.length) && MathUtil.isPowerOf2(flashCartArrayBuffer.byteLength - MAGIC.length));
}

function isOldStyleSave(flashCartArrayBuffer) {
  // FIXME: The EEPROM part is a complete guess: we don't know how an EEPROM save in the "old sty;e" looks, since there weren't any in our set of sample files.
  // See also convertFromOldStyleToRaw()
  return ((GenesisUtil.isEepromSave(flashCartArrayBuffer) || GenesisUtil.isByteExpanded(flashCartArrayBuffer)) && MathUtil.isPowerOf2(flashCartArrayBuffer.byteLength));
}

function isRawSave(rawArrayBuffer) {
  return ((GenesisUtil.isEepromSave(rawArrayBuffer) || GenesisUtil.isByteExpanded(rawArrayBuffer)) && MathUtil.isPowerOf2(rawArrayBuffer.byteLength));
}

function convertFromOldStyleToRaw(flashCartArrayBuffer) {
  // FIXME: This is a complete guess: we don't know how an EEPROM save in the "old sty;e" looks, since there weren't any in our set of sample files.
  // See also isOldStyleSave()
  if (GenesisUtil.isEepromSave(flashCartArrayBuffer)) {
    return PaddingUtil.padAtEndToMinimumSize(flashCartArrayBuffer, RAW_FILL_BYTE, RAW_EEPROM_MIN_SIZE); // EEPROM saves don't get byte expanded
  }

  const padding = PaddingUtil.getPadFromEndValueAndCount(flashCartArrayBuffer);
  const unpaddedArrayBuffer = PaddingUtil.removePaddingFromEnd(flashCartArrayBuffer, padding.count);

  return GenesisUtil.changeFillByte(unpaddedArrayBuffer, RAW_FILL_BYTE);
}

function convertFromNewStyleToRaw(flashCartArrayBuffer) {
  // First, check if we're an EEPROM save. These have the magic on the front, and are padded out.

  // For whatever reason, we've observed files in the new style padded with both 0xFF and 0x00.

  const collapsedArrayBuffer = flashCartArrayBuffer.slice(MAGIC.length);
  const padding = PaddingUtil.getPadFromEndValueAndCount(collapsedArrayBuffer);
  const collapsedUnpaddedArrayBuffer = PaddingUtil.removePaddingFromEnd(collapsedArrayBuffer, padding.count);

  if (GenesisUtil.isEepromSave(collapsedUnpaddedArrayBuffer)) {
    return PaddingUtil.padAtEndToMinimumSize(collapsedUnpaddedArrayBuffer, RAW_FILL_BYTE, RAW_EEPROM_MIN_SIZE); // EEPROM saves don't get byte expanded
  }

  return PaddingUtil.padAtEndToMinimumSize(GenesisUtil.byteExpand(collapsedUnpaddedArrayBuffer, RAW_FILL_BYTE), RAW_FILL_BYTE, RAW_SRAM_MIN_SIZE);
}

function convertFromRawToNewStyle(rawArrayBuffer) {
  // Remember that we may be given data in the Retrode style, with repeated bytes, or in the
  // Mega Everdrive Pro/emulator-style file (filled with 0x00 instead)

  const textEncoder = new TextEncoder(MAGIC_ENCODING);
  const magicArrayBuffer = Util.bufferToArrayBuffer(textEncoder.encode(MAGIC));

  const padding = PaddingUtil.getPadFromEndValueAndCount(rawArrayBuffer);
  let unpaddedArrayBuffer = PaddingUtil.removePaddingFromEnd(rawArrayBuffer, padding.count);

  let paddingByte = MEGA_SD_NEW_STYLE_PADDING_BYTE_EEPROM;

  if (!GenesisUtil.isEepromSave(unpaddedArrayBuffer)) {
    unpaddedArrayBuffer = GenesisUtil.byteCollapse(rawArrayBuffer);
    paddingByte = MEGA_SD_NEW_STYLE_PADDING_BYTE_SRAM;
  }

  return Util.concatArrayBuffers([magicArrayBuffer, PaddingUtil.padAtEndToMinimumSize(unpaddedArrayBuffer, paddingByte, MEGA_SD_NEW_STYLE_PADDED_SIZE)]);
}

export default class GenesisMegaSdGenesisFlashCartSaveData {
  static NEW_STYLE_MAGIC = MAGIC;

  static createFromFlashCartData(flashCartArrayBuffer) {
    if (isNewStyleSave(flashCartArrayBuffer)) {
      return new GenesisMegaSdGenesisFlashCartSaveData(flashCartArrayBuffer, convertFromNewStyleToRaw(flashCartArrayBuffer));
    }

    if (isOldStyleSave(flashCartArrayBuffer)) {
      return new GenesisMegaSdGenesisFlashCartSaveData(flashCartArrayBuffer, convertFromOldStyleToRaw(flashCartArrayBuffer));
    }

    throw new Error('This does not appear to be a Mega SD Genesis save file');
  }

  static createFromRawData(rawArrayBuffer) {
    if (isRawSave(rawArrayBuffer)) {
      return new GenesisMegaSdGenesisFlashCartSaveData(convertFromRawToNewStyle(rawArrayBuffer), rawArrayBuffer);
    }

    throw new Error('This does not appear to be a raw Genesis save file');
  }

  static createWithNewSize(flashCartSaveData, newSize) {
    const newRawSaveData = SaveFilesUtil.resizeRawSave(flashCartSaveData.getRawArrayBuffer(), newSize); // Note that we're resizing the raw save here, which has a fill byte of 0x00, so it's okay to pad with zeros via this function

    return GenesisMegaSdGenesisFlashCartSaveData.createFromRawData(newRawSaveData);
  }

  static getFlashCartFileExtension() {
    return 'SRM';
  }

  static getRawFileExtension() {
    return null;
  }

  static requiresRomClass() {
    return null;
  }

  static adjustOutputSizesPlatform() {
    return null; // We pad out our files, so this doesn't make much sense here
  }

  constructor(flashCartArrayBuffer, rawArrayBuffer) {
    this.flashCartArrayBuffer = flashCartArrayBuffer;
    this.rawArrayBuffer = rawArrayBuffer;
  }

  getRawArrayBuffer() {
    return this.rawArrayBuffer;
  }

  getFlashCartArrayBuffer() {
    return this.flashCartArrayBuffer;
  }
}