<?php
include_once 'logincheck.php';
include 'includes/Fns.php';

if(!empty($_GET['Error'])){$err=$_GET['Error'];} else{ $err=""; }
if(!empty($_GET['Success'])){ $Succ=$_GET['Success']; } else { $Succ=""; }

?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
		<title>Lakeeshop - Create B2B</title>i
		<meta name="description" content="Winkle is a Dashboard & Admin Site Responsive Template by hencework." />
		<meta name="keywords" content="admin, admin dashboard, admin template, cms, crm, Winkle Admin, Winkleadmin, premium admin templates, responsive admin, sass, panel, software, ui, visualization, web app, application" />
		<meta name="author" content="hencework"/>
		
		<!-- Favicon -->
		<link rel="shortcut icon" href="favicon.ico">
		<link rel="icon" href="favicon.ico" type="image/x-icon">
		
		<!-- vector map CSS -->
		<link href="../vendors/bower_components/jasny-bootstrap/dist/css/jasny-bootstrap.min.css" rel="stylesheet" type="text/css"/>
		
		<!-- Data table CSS -->
		<link href="../vendors/bower_components/datatables/media/css/jquery.dataTables.min.css" rel="stylesheet" type="text/css"/>
	
		<!-- Custom CSS -->
		<link href="dist/css/style.css" rel="stylesheet" type="text/css">
		<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
	</head>
	<style>
		body {
		    color: #000000;
		    font-family: "Poppins", sans-serif;
		    font-size: 12px;
		    font-style: normal;
		    line-height: 1.5;
		    background: #192D46;
		    overflow-x: hidden;
		}
		.table > tbody > tr > td, .jsgrid-table > tbody > tr > td, .table > tbody > tr > th, .jsgrid-table > tbody > tr > th, .table > tfoot > tr > td, .jsgrid-table > tfoot > tr > td, .table > tfoot > tr > th, .jsgrid-table > tfoot > tr > th, .table > thead > tr > td, .jsgrid-table > thead > tr > td, .table > thead > tr > th, .jsgrid-table > thead > tr > th {
		    padding: 3px;
		    border-top: 2px solid #f5f5f5;
		    vertical-align: middle;
		}
		.pb-30 {
		    padding-bottom: 10px !important;
		}
		.btn.btn-circle, .fixed-sidebar-left .side-nav > li > a.btn-circle.documentation-btn, .wizard > .actions a.btn-circle, .dt-buttons .btn-circle.dt-button, .tablesaw-sortable th.tablesaw-sortable-head button.btn-circle, .sweet-alert button.btn-circle, .owl-theme .owl-nav .btn-circle[class*="owl-"], button.btn-circle.fc-agendaDay-button.fc-state-default.fc-corner-right, button.btn-circle.fc-month-button.fc-state-default.fc-corner-left, button.btn-circle.fc-agendaWeek-button, .btn-circle.fc-prev-button, .btn-circle.fc-next-button, .btn-circle.fc-today-button {
		    height: 32px;
		    width: 32px;
		    padding: 0;
		    border-radius: 50%;
		}
		.page-wrapper {
		    margin-left: 250px;
		    padding: 0px 20px;
		    position: relative;
		    background: #fff;
		    -webkit-transition: all 0.4s ease;
		    -moz-transition: all 0.4s ease;
		    transition: all 0.4s ease;
		    left: 0;
		}
		.card-view.panel .panel-body {
		    padding: 0px 0 0px;
		}
		.mb-10 {
		    margin-bottom: 10px !important;
		    margin-top: 10px;
		}
		.form-control {
		    border: 1px solid rgba(33, 33, 33, 0.32);
		    border-radius: 0;
		    background-color: #fff;
		    box-shadow: none;
		    color: #272B34;
		    height: 30px;
		    font-size: 14px;
		}
		hr {
		    margin-top: 10px;
		    margin-bottom: 0px;
		    border-top: 2px solid #4dad44;
		}
		.card-view {
		    background: #fffefe;
		    margin-bottom: 2px;
		    border: none;
		    border-radius: 3px;
		    box-shadow: 0 1px 18px rgba(0, 0, 0, 0.1);
		    padding: 15px 15px 0;
		}
		.card-view {
		    background: #fffefe;
		    margin-bottom: 2px;
		    border: none;
		    border-radius: 3px;
		    box-shadow: 0 1px 18px rgba(0, 0, 0, 0.1);
		    padding: 15px 15px 15px 15px;
		}
		.disabled-look {
		  background-color: #e9ecef;
		  cursor: not-allowed;
		  pointer-events: none;
		  color: #6c757d;
		}
	</style>
	<body>
		<!--Preloader-->
		<div class="preloader-it">
			<div class="la-anim-1"></div>
		</div>
		<!--/Preloader-->
		<div class="wrapper theme-1-active navbar-top-chrome horizontal-nav">
			<!-- Main Content -->
			<div class="page-wrapper">
				<div class="container-fluid">
					<?php include 'widget/header.php'; ?>
					<div class="row" style="margin-top: 10px;">
						<div class="col-md-12">
							<div class="panel panel-default card-view">
								<div class="panel-wrapper collapse in">
									<div class="panel-body">
										<div class="row" style="margin-right: 0px;margin-left: 0px;">
											<div class="col-md-12">
												<div class="form-wrap">
													<div class="form-body">
													<center><span id="msg"></span></center>	
														<div class="pull-left">
															<h6 class="panel-title txt-dark">Ad-hoc PO</h6>
														</div><br>
														<hr class="light-grey-hr"/>
														<template id="supplierBlockTemplate">
															<div class="supplierInvoiceBlock mt-4 border p-3 rounded">
																<h5>Supplier Details</h5>
																<div class="row">
																	<div class="col-md-4">
																		<label>Supplier (from List)</label>
																		<select name="supplierId[__index__]" class="form-control js-example-basic-single">
																			<option value="0">-- Select --</option>
																			<?php 
																				$sqlsup = "SELECT * FROM `vsmanagesupplier` WHERE `vmsStatus` = 1 AND vmsName <> '' GROUP BY vmsName ORDER BY `vsmanagesupplier`.`vmsName` ASC";
																				$ressup = $mysqli->query($sqlsup);
																				while ($rowsup = $ressup->fetch_assoc()) {
																				 	?>
																				 	<option value="<?php echo $rowsup['vmsRefID']; ?>"><?php echo $rowsup['vmsName']; ?></option>
																				 	<?php
																				 } 
																			?>
																		</select>
																	</div>
																	<div class="col-md-4">
																		<label>OR Enter Supplier Name</label>
																		<input type="text" name="supplierName[__index__]" class="form-control">
																	</div>
																	<div class="col-md-2">
																		<label>Invoice No</label>
																		<input type="text" name="invoiceNo[__index__]" class="form-control">
																	</div>
																	<div class="col-md-2">
																		<label>Invoice Date</label>
																		<input type="date" name="invoiceDate[__index__]" class="form-control">
																	</div>
																</div>

																<!--<h6 class="mt-3" style="margin-top: 10px;">Products Supplied by this Supplier</h6>-->
																<div class="linkedProductRows">
																	<div class="row linkedProductRow">
																		<div class="col-md-4">
																			<label>Select One-Time Product</label>
																			<select name="linkedProductName[__index__][]" class="form-control onetime-products">
																				<!-- will be populated dynamically via JS -->
																			</select>
																		</div>
																		<div class="col-md-2">
																			<label>Qty</label>
																			<input type="number" name="linkedProductQty[__index__][]" class="form-control" min="1">
																		</div>
																		<div class="col-md-2">
																			<label>HSN</label>
																			<input type="text" name="linkedProductHsn[__index__][]" class="form-control">
																		</div>
																		<div class="col-md-2">
																			<label>Tax %</label>
																			<input type="number" name="linkedProductTax[__index__][]" class="form-control" step="0.01">
																		</div>
																		<div class="col-md-2">
																			<label>Cost Price</label>
																			<input type="number" name="linkedProductCost[__index__][]" class="form-control" step="0.01">
																		</div>
																	</div>
																</div>

																<div class="text-right mt-2">
																	<button type="button" class="btn btn-sm btn-secondary add-product-btn" onclick="addLinkedProductRow(this)">+ Add Product</button>
																</div>

																<hr>
															</div>
														</template>

														<form id="subForm" method="post" action="crud/save_adhoc_po.php">
															<div class="row">
																<!-- Client Section -->
																<div class="col-md-4">
																	<div class="form-group">
																		<label class="control-label mb-10">Sales Person Name</label>
																		<select class="form-control js-example-basic-single" id="salesby" name="salesby" >
																			<option value="7">JD Sir</option>
																			<option value="18">Ashik Rahman</option>
																			<option value="9">Raju YA</option>
																			<option value="68">Jagath Ratchagan</option>
																		</select>
																	</div>
																</div>
															</div>

															<hr class="light-grey-hr"/>

															<div class="row">
																<!-- Client Section -->
																<div class="col-md-4">
																	<div class="form-group">
																		<label class="control-label mb-10">Client Name</label>
																		<select class="form-control js-example-basic-single" id="cltid" name="cltid" onchange="toggleClientInput();">
																			<option value="0">-- Select --</option>
																			<?php 
																			$sql = "SELECT vmcCltRefID, vmcCltName FROM vsmanageclient WHERE vmcStatus = 1 ORDER BY vmcCltName";
																			$res = $mysqli->query($sql);
																			if($res) {
																				while($row = $res->fetch_assoc()) {
																					echo "<option value='{$row['vmcCltRefID']}'>{$row['vmcCltName']}</option>";
																				}
																			}
																			?>
																		</select>
																	</div>
																</div>
																<div class="col-md-3">
																	<div class="form-group">
																		<label class="control-label mb-10">OR Enter Client Name</label>
																		<input type="text" class="form-control" id="cltName" name="cltName" oninput="toggleClientSelect()">
																	</div>
																</div>
																<div class="col-md-3">
																	<div class="form-group">
																		<label class="control-label mb-10">PO Number (if any)</label>
																		<input type="text" class="form-control" id="ponumber" name="ponumber" value="<?php echo "B2BPO".date("ymdHi"); ?>" >
																	</div>
																</div>
																<div class="col-md-2">
																	<div class="form-group">
																		<label class="control-label mb-10">PO Date</label>
																		<input type="date" class="form-control" id="podate" name="podate" value="<?php echo date('Y-m-d'); ?>" >
																	</div>
																</div>
															</div>

															<hr class="light-grey-hr"/>

															<div class="row">
																<div class="col-md-2">
																	<label>Ship to Name</label>
																	<input type="text" name="shipToName" class="form-control" required>
																</div>
																<div class="col-md-2">
																	<label>Mobile number</label>
																	<input type="text" name="shipToMob" class="form-control" pattern="\d{10}" minlength="10" maxlength="10" inputmode="numeric" required>
																</div>
																<div class="col-md-4">
																	<label>Address 1</label>
																	<input type="text" name="shipTo1Add" class="form-control" required>
																</div>
																<div class="col-md-4">
																	<label>Address 2</label>
																	<input type="text" name="shipTo2Add" class="form-control">
																</div>
																<div class="col-md-4">
																	<label>Address 3</label>
																	<input type="text" name="shipTo3Add" class="form-control">
																</div>
																<div class="col-md-4">
																	<label>Address 4</label>
																	<input type="text" name="shipTo4Add" class="form-control">
																</div>
																<div class="col-md-2">
																	<label>City</label>
																	<input type="text" name="shipToCity" class="form-control" required>
																</div>
																<div class="col-md-2">
																	<label>Pincode</label>
																	<input type="text" name="shipToPin" class="form-control" pattern="\d{6}" maxlength="6" inputmode="numeric"  required>
																</div>
															</div>

															<hr class="light-grey-hr"/>
															<input type="checkbox" onclick="copyShippingToBilling(this)"> Billing Same as Shipping
															<div class="row">
																<div class="col-md-2">
																	<label>Bill to Name</label>
																	<input type="text" name="billToName" class="form-control" required>
																</div>
																<div class="col-md-2">
																	<label>Mobile Number</label>
																	<input type="text" name="billToMob" class="form-control" pattern="\d{10}" minlength="10" maxlength="10" inputmode="numeric" required>
																</div>

																<div class="col-md-4">
																	<label>Address 1</label>
																	<input type="text" name="billTo1Add" class="form-control" required>
																</div>
																<div class="col-md-4">
																	<label>Address 2</label>
																	<input type="text" name="billTo2Add" class="form-control">
																</div>
																<div class="col-md-4">
																	<label>Address 3</label>
																	<input type="text" name="billTo3Add" class="form-control">
																</div>
																<div class="col-md-4">
																	<label>Address 4</label>
																	<input type="text" name="billTo4Add" class="form-control">
																</div>
																<div class="col-md-2">
																	<label>City</label>
																	<input type="text" name="billToCity" class="form-control" required>
																</div>
																<div class="col-md-2">
																	<label>Pincode</label>
																	<input type="text" name="billToPin" class="form-control" pattern="\d{6}" maxlength="6" inputmode="numeric"  required>
																</div>
																<div class="col-md-2">
																	<label>Courier Price</label>
																	<input type="number" name="couprc" class="form-control" value="0">
																</div>
															</div>

															<hr>

															<!-- Product Section -->
															<div class="row productRow" style="margin-top: 10px;">
																<div class="col-md-4">
																	<div class="col-md-6">
																		<div class="form-group">
																			<label>Product (from Catalog)</label>
																			<select class="form-control js-example-basic-single product-select" name="productId[]">
																				<option value="0">-- Select Product --</option>
																				<?php
																				$psql = "SELECT vmRefID, vmProdName FROM vsmproduct WHERE vmStatus = 1 ORDER BY vmProdName";
																				$pres = $mysqli->query($psql);
																				if($pres) {
																					while($prow = $pres->fetch_assoc()) {
																						echo "<option value='{$prow['vmRefID']}'>{$prow['vmProdName']}</option>";
																					}
																				}
																				?>
																			</select>
																			
																		</div>
																	</div>
																	<div class="col-md-6">
																		<div class="form-group">
																			<label>OR Enter Product Name</label>
																			<input type="text" class="form-control product-name" name="productName[]">
																		</div>
																	</div>
																	<span class="text-info selected-product-name"></span>
																</div>
																	

																<div class="col-md-2">
																	<div class="form-group">
																		<label>Quantity</label>
																		<input type="number" class="form-control qty" name="productQty[]" value="1" required>
																		<small class="text-warn stock-info"></small>
																	</div>
																</div>

																<div class="col-md-2">
																	<div class="form-group">
																		<label>Unit Share Price</label>
																		<input type="number" class="form-control" name="sharePrice[]" step="0.01" required>
																	</div>
																</div>

																<div class="col-md-2">
																	<div class="form-group">
																		<label>HSN Code</label>
																		<input type="text" class="form-control hsn" name="productHsn[]">
																	</div>
																</div>

																<div class="col-md-2">
																	<div class="form-group">
																		<label>Tax %</label>
																		<input type="number" class="form-control prodtax" name="productTax[]" step="0.01">
																	</div>
																</div>
															</div>

															<!-- Button to add more product rows -->
															<div class="row">
																<div class="col-md-12 text-right">
																	<button type="button" class="btn btn-info btn-sm" onclick="addProductRow()">+ Add Product</button>
																</div>
															</div>

															<hr>

															<!-- Supplier Section -->
															<div id="supplierSectionWrapper">
																<!-- Supplier blocks will be appended here -->
															</div>

															<div id="addSupplierBtnWrapper" class="text-right" style="display: none;">
																<button type="button" class="btn btn-sm btn-info" onclick="addSupplierBlock()">+ Add Supplier</button>
																<hr>
															</div>

															<!-- Submit Button -->
															<div class="row">
																<div class="col-md-12 text-right">
																	<button type="submit" class="btn btn-success" onclick="disableAndSubmit(event, this)">Submit PO</button>
																</div>
															</div>
														</form>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>		
						</div>
					</div>
				
				<div class="row" style="margin-top: 10px;">
				</div></div>
				<!-- Row-->
			</div>
			<!-- /Main Content -->
		</div>
		<!-- /#wrapper -->
		
		<!-- JavaScript -->
		
		<!-- jQuery -->
		<script src="../vendors/bower_components/jquery/dist/jquery.min.js"></script>
		
		<!-- Bootstrap Core JavaScript -->
		<script src="../vendors/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
		<script src="../vendors/bower_components/jasny-bootstrap/dist/js/jasny-bootstrap.min.js"></script>
		
		<!-- Data table JavaScript -->
		<script src="../vendors/bower_components/datatables/media/js/jquery.dataTables.min.js"></script>
		<script src="dist/js/dataTables-data.js"></script>

		<script src="../vendors/bower_components/datatables.net-buttons/js/dataTables.buttons.min.js"></script>
		<script src="../vendors/bower_components/datatables.net-buttons/js/buttons.flash.min.js"></script>
		<script src="../vendors/bower_components/jszip/dist/jszip.min.js"></script>
		<script src="../vendors/bower_components/pdfmake/build/pdfmake.min.js"></script>
		<script src="../vendors/bower_components/pdfmake/build/vfs_fonts.js"></script>
		<script src="../vendors/bower_components/datatables.net-buttons/js/buttons.html5.min.js"></script>
		<script src="../vendors/bower_components/datatables.net-buttons/js/buttons.print.min.js"></script>

		<!-- Slimscroll JavaScript -->
		<script src="dist/js/jquery.slimscroll.js"></script>
	
		<!-- Fancy Dropdown JS -->
		<script src="dist/js/dropdown-bootstrap-extended.js"></script>
		
		<!-- Owl JavaScript -->
		<script src="../vendors/bower_components/owl.carousel/dist/owl.carousel.min.js"></script>
	
		<!-- Switchery JavaScript -->
		<script src="../vendors/bower_components/switchery/dist/switchery.min.js"></script>
	
		<!-- Init JavaScript -->
		<script src="dist/js/init.js"></script>
		
		<script  src="dist/js/timeout.js"></script>
		<script  src="dist/js/usertype.js"></script>
		
		<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
		
		<script>

			let supplierBlockAddedAutomatically = false;
			let supplierIndex = 0;
			let oneTimeProducts = [];
		
			$(document).ready(function() {
	        
				var err = "<?= $err; ?>";
				var succ = "<?= $Succ; ?>";
				if(err!=""){ displaymessage(err);}
				if(succ!=""){ displaymessage(succ);}
				$('.js-example-basic-single').select2();

				bindProductRowEvents();

				$(document).on('blur', '.product-name', function () {
					if (collectOneTimeProducts()) {
						refreshOneTimeProductDropdowns();
						checkAndAddInitialSupplierBlock();
						checkOneTimeProductFulfillment();
					}
				});

				$(document).on('blur','input[name="productQty[]"],  input[name^="linkedProductQty"]', function () {
					checkOneTimeProductFulfillment();
				});

				$(document).on('change', '.onetime-products', function () {
					checkOneTimeProductFulfillment();
				});

				document.addEventListener("input", function(e) {
				  if (e.target.classList.contains("is-invalid")) {
				    removeError(e.target);
				  }
				});
				
		    });

		</script>
<script>

function addProductRow() {
	let $lastRow = $('.productRow').last();
	$lastRow.find('.js-example-basic-single').select2('destroy');
	let $clone = $lastRow.clone(true, true); 

	$clone.find('input').val('').prop('readonly', false).removeClass('disabled-look');
	$clone.find('select').val("0").prop('readonly', false).removeClass('disabled-look');
	$clone.find('.stock-info').text('');
	$clone.find('.selected-product-name').text('');
	$clone.find('label').remove();

	$clone.find('.js-example-basic-single').removeAttr('data-select2-id').removeClass('select2-hidden-accessible');
	$clone.find('.select2').remove();
	
	$clone.find('.js-example-basic-single').select2();

	$clone.insertAfter($lastRow);

	bindProductRowEvents($clone); 

	checkAndAddInitialSupplierBlock();
}

function disableAndSubmit(e, btn) {
  e.preventDefault();

  let form = btn.form;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // ✅ Add custom validation
  if (!customValidateForm(form)) {
    return;
  }

  btn.disabled = true;
  form.requestSubmit();
}

function customValidateForm(form) {

  clearAllErrors();

  // 1. Client
  if (form.cltid.value == "0" && form.cltName.value.trim() === "") {
    showError(form.cltName, "Select client or enter client name");
    return false;
  }

  // 4. Product rows
  let rows = document.querySelectorAll('.productRow');

  for (let row of rows) {
    let pid = row.querySelector('[name="productId[]"]');
    let pname = row.querySelector('[name="productName[]"]');
    let share = row.querySelector('[name="sharePrice[]"]');

    if ((pid.value == "0" || pid.value === "") && pname.value.trim() === "") {
      showError(pname, "Select product or enter name");
      return false;
    }

    if (share.value === "" || parseFloat(share.value) <= 0) {
      showError(share, "Enter share price");
      return false;
    }
  }

  return true;
}

function copyShippingToBilling(chk) {
  if (chk.checked) {
    billToName.value = shipToName.value;
    billToMob.value = shipToMob.value;
    billTo1Add.value = shipTo1Add.value;
    billToCity.value = shipToCity.value;
    billToPin.value = shipToPin.value;
  }
}

function showError(el, message) {
  removeError(el);

  const error = document.createElement("div");
  error.className = "text-danger error-msg";
  error.style.fontSize = "12px";
  error.innerText = message;

  el.classList.add("is-invalid");
  el.parentNode.appendChild(error);

  el.focus();
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function removeError(el) {
  el.classList.remove("is-invalid");

  const existing = el.parentNode.querySelector(".error-msg");
  if (existing) existing.remove();
}

function clearAllErrors() {
  document.querySelectorAll(".error-msg").forEach(e => e.remove());
  document.querySelectorAll(".is-invalid").forEach(e => e.classList.remove("is-invalid"));
}

function bindProductRowEvents(context = document) {
	// Bind dropdown change
	$(context).find('.product-select').off('change').on('change', function () {
		let $row = $(this).closest('.productRow');
		let selectedVal = $(this).val();
		let selectedText = $(this).find('option:selected').text();

		$row.find('.stock-info').text('');
		$row.find('.qty').prop('required', true);

		// Enable/disable textbox based on selection
		if (selectedVal !== "0" && selectedVal !== null && selectedVal !== "") {
			$row.find('.product-name').val('').prop('readonly', true).addClass('disabled-look');
			$row.find('.selected-product-name').text(selectedText);
		} else {
			$row.find('.product-name').prop('readonly', false).removeClass('disabled-look');
			$row.find('.selected-product-name').text('');
			$row.find('.stock-info').text('');
		}

		var dataString = 'vspRefID='+ selectedVal;
		$.ajax({
			type: "POST",
				url: 'includes/get_ProdQty.php',
				data: dataString,
				dataType: 'json',
				success: function (data)
				{
					console.log(data);

					$row.find('.stock-info').text(`Stock Available: ${data[0]['totstock']}`);
				
            }
        });

        $.ajax({
				type: "POST",
 				url: 'includes/get_ProdCode.php',
 				data: dataString,
 				dataType: 'json',
 				success: function (data)
 				{
 					console.log(data);
 					$row.find('.prodtax').val(data.perc);
 					$row.find('.hsn').val(data.hsn);
                }
            });
	});

	// Bind textbox input
	$(context).find('.product-name').off('input').on('input', function () {
		let $row = $(this).closest('.productRow');
		let inputVal = $(this).val().trim();

		if (inputVal !== "") {
			$row.find('.product-select').prop('readonly', true).addClass('disabled-look');
		} else {
			$row.find('.product-select').prop('readonly', false).removeClass('disabled-look');
		}
	});
}

function toggleClientInput() {
	if ($('#cltid').val() !== "0") {
		$('#cltName').attr('readonly','readonly').addClass('disabled-look');
		$('#cltName').val("");
	} else {
		$('#cltName').removeAttr('readonly').removeClass('disabled-look');
	}
}

function toggleClientSelect() {
	if ($('#cltName').val() !== "") {
		$('#cltid').attr('readonly','readonly').addClass('disabled-look');
		$('#cltid').val("0");
	} else {
		$('#cltid').removeAttr('readonly').removeClass('disabled-look');
	}
}

function collectOneTimeProducts() {
	oneTimeProducts = [];

	$('.productRow').each(function () {
		let dropdown = $(this).find('.product-select');
		let pname = $(this).find('.product-name').val().trim();

		if ((dropdown.val() === "0" || dropdown.val() === null) && pname !== "") {
			oneTimeProducts.push({ name: pname });
		}
	});

	return oneTimeProducts.length > 0;
}

function refreshOneTimeProductDropdowns() {
	const productOptions = oneTimeProducts
		.map(p => `<option value="${p.name}">${p.name}</option>`)
		.join('');

	$('.onetime-products').each(function () {
		const currentVal = $(this).val(); // remember selected item
		$(this).html(productOptions);

		// Try to retain previous selection if it still exists
		if (currentVal && oneTimeProducts.some(p => p.name === currentVal)) {
			$(this).val(currentVal);
		} else {
			$(this).val(""); // reset if invalid
		}
	});
}

function checkAndAddInitialSupplierBlock() {
	if (!supplierBlockAddedAutomatically && collectOneTimeProducts()) {
		addSupplierBlock();
		supplierBlockAddedAutomatically = true;

		// Ensure button is visible after first auto-insert
		$('#addSupplierBtnWrapper').show();
	}
}

function addSupplierBlock() {
	const template = document.getElementById('supplierBlockTemplate').innerHTML;
	const blockHtml = template.replace(/__index__/g, supplierIndex);
	const $block = $(blockHtml);

	// Populate one-time product dropdowns
	const productOptions = oneTimeProducts.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
	$block.find('.onetime-products').each(function() {
		$(this).html(productOptions);
	});

	// Reinit select2 if needed
	//$block.find('.js-example-basic-single').select2();

	$('#supplierSectionWrapper').append($block);

	// Show the "+ Add Supplier" button
	$('#addSupplierBtnWrapper').show();

	supplierIndex++;
}

function addLinkedProductRow(btn) {
	const $container = $(btn).closest('.supplierInvoiceBlock').find('.linkedProductRows');
	const $last = $container.find('.linkedProductRow').last();
	const $clone = $last.clone();

	$clone.find('input').val('');
	$clone.find('label').remove();
	$container.append($clone);
}

function checkOneTimeProductFulfillment() {
	let productQtyMap = {};
	let hasAnyLinkedProduct = false;

	// Step 1: Collect required qty from PO section
	$('.productRow').each(function () {
		let dropdown = $(this).find('.product-select');
		let name = $(this).find('.product-name').val().trim();
		let qty = parseInt($(this).find('input[name="productQty[]"]').val()) || 0;

		if ((dropdown.val() === "0" || dropdown.val() === null) && name !== "") {
			if (!productQtyMap[name]) productQtyMap[name] = { required: 0, supplied: 0 };
			productQtyMap[name].required += qty;
		}
	});

	// Step 2: Collect supplied qty from supplier invoice blocks
	$('.supplierInvoiceBlock').each(function () {
		$(this).find('.linkedProductRow').each(function () {
			let pname = $(this).find('.onetime-products').val();
			let qty = parseInt($(this).find('input[name^="linkedProductQty"]').val()) || 0;

			if (pname && productQtyMap[pname]) {
				productQtyMap[pname].supplied += qty;
				hasAnyLinkedProduct = true;
			}
		});
	});

	// Step 3: If no product linked yet, allow supplier additions
	if (!hasAnyLinkedProduct) {
		$('#addSupplierBtnWrapper button').prop('disabled', false);
		$('.add-product-btn').prop('disabled', false);
		return;
	}

	// Step 4: Fulfillment check
	let allFulfilled = true;

	Object.values(productQtyMap).forEach(item => {
		if (item.supplied < item.required) {
			allFulfilled = false;
		}
	});

	// Step 5: Enable/disable add supplier button
	$('#addSupplierBtnWrapper button').prop('disabled', allFulfilled);

	// Step 6: Disable add product in each block if fully fulfilled
	$('.supplierInvoiceBlock').each(function () {
		let disableAdd = allFulfilled;
		$(this).find('.add-product-btn').prop('disabled', disableAdd);
	});
}

</script>	
</body>
</html>